package main

import (
	"context"
	"database/sql"
	"errors"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"classdrive/internal/server"
	_ "modernc.org/sqlite"
)

func defaultPort() string {
	return "80"
}

func normalizePort(raw string) (string, bool) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "", false
	}
	port, err := strconv.Atoi(trimmed)
	if err != nil || port < 1 || port > 65535 {
		return "", false
	}
	return strconv.Itoa(port), true
}

func savedConfiguredPort(baseDir string) (string, bool) {
	dbPath := filepath.Join(baseDir, "var", "data", "classdrive.db")
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return "", false
	}
	defer db.Close()

	var savedPort string
	if err := db.QueryRow(`select server_port from system_settings where id = 1`).Scan(&savedPort); err != nil {
		return "", false
	}
	if port, ok := normalizePort(savedPort); ok {
		return port, true
	}
	return "", false
}

func configuredPort(baseDir string) string {
	if port, ok := savedConfiguredPort(baseDir); ok {
		return port
	}
	return defaultPort()
}

func startupHost(detectHost func() (string, bool)) string {
	host, ok := detectHost()
	if ok {
		return host
	}

	return "127.0.0.1"
}

func detectOutboundIPv4() (string, bool) {
	conn, err := net.DialTimeout("udp4", "8.8.8.8:80", 200*time.Millisecond)
	if err != nil {
		return "", false
	}
	defer conn.Close()

	localAddr, ok := conn.LocalAddr().(*net.UDPAddr)
	if !ok {
		return "", false
	}

	ip := localAddr.IP.To4()
	if ip == nil || ip.IsLoopback() || ip.IsUnspecified() {
		return "", false
	}

	return ip.String(), true
}

func startupURL(host string, port string) string {
	if port == "80" {
		return "http://" + host + "/"
	}
	return "http://" + host + ":" + port + "/"
}

func isAddressInUse(err error) bool {
	if errors.Is(err, syscall.EADDRINUSE) {
		return true
	}
	message := strings.ToLower(err.Error())
	return strings.Contains(message, "address already in use") ||
		strings.Contains(message, "only one usage of each socket address")
}

func isPermissionDenied(err error) bool {
	if errors.Is(err, syscall.EACCES) || errors.Is(err, os.ErrPermission) {
		return true
	}
	message := strings.ToLower(err.Error())
	return strings.Contains(message, "permission denied") || strings.Contains(message, "access is denied")
}

func listenErrorMessage(port string, err error) string {
	if port == "80" && isAddressInUse(err) {
		return "80 端口已被占用，请自定义访问端口后重启。"
	}
	if port == "80" && isPermissionDenied(err) {
		return "当前系统不允许监听 80 端口，请以管理员身份运行，或自定义访问端口后重启。"
	}
	return err.Error()
}

type runtimeHTTPListener struct {
	port     string
	server   *http.Server
	listener net.Listener
}

type runtimeHTTPServer struct {
	handler http.Handler
	mu      sync.Mutex
	current *runtimeHTTPListener
	errors  chan error
}

func newRuntimeHTTPServer(handler http.Handler) *runtimeHTTPServer {
	return &runtimeHTTPServer{
		handler: handler,
		errors:  make(chan error, 1),
	}
}

func (runtime *runtimeHTTPServer) start(port string) error {
	prepared, err := runtime.preparePortChange(port)
	if err != nil {
		return err
	}
	prepared.Commit()
	return nil
}

func (runtime *runtimeHTTPServer) preparePortChange(rawPort string) (server.PreparedServerPortChange, error) {
	port, ok := normalizePort(rawPort)
	if !ok {
		return server.PreparedServerPortChange{}, errors.New("端口必须为 1-65535 的数字")
	}
	listener, err := net.Listen("tcp", ":"+port)
	if err != nil {
		return server.PreparedServerPortChange{}, err
	}
	next := &runtimeHTTPListener{
		port: port,
		server: &http.Server{
			Handler: runtime.handler,
		},
		listener: listener,
	}
	committed := false
	return server.PreparedServerPortChange{
		Commit: func() {
			runtime.mu.Lock()
			previous := runtime.current
			runtime.current = next
			runtime.mu.Unlock()
			committed = true
			log.Printf("ClassDrive listening on %s", startupURL(startupHost(detectOutboundIPv4), port))
			go runtime.serve(next)
			if previous != nil {
				go runtime.shutdownPrevious(previous)
			}
		},
		Cancel: func() {
			if !committed {
				_ = listener.Close()
			}
		},
	}, nil
}

func (runtime *runtimeHTTPServer) serve(item *runtimeHTTPListener) {
	if err := item.server.Serve(item.listener); err != nil && !errors.Is(err, http.ErrServerClosed) {
		select {
		case runtime.errors <- err:
		default:
		}
	}
}

func (runtime *runtimeHTTPServer) shutdownPrevious(item *runtimeHTTPListener) {
	time.Sleep(2 * time.Second)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	_ = item.server.Shutdown(ctx)
}

func (runtime *runtimeHTTPServer) wait() error {
	return <-runtime.errors
}

func (runtime *runtimeHTTPServer) currentPort() string {
	runtime.mu.Lock()
	defer runtime.mu.Unlock()
	if runtime.current == nil {
		return defaultPort()
	}
	return runtime.current.port
}

func startupCredentialsMessage() string {
	return "默认管理员账号：" + server.DefaultTeacherUsername + "，默认密码：" + server.DefaultTeacherPassword + "（首次登录后请及时修改密码）"
}

func main() {
	baseDir := os.Getenv("CLASSDRIVE_BASE_DIR")
	if baseDir == "" {
		var err error
		baseDir, err = os.Getwd()
		if err != nil {
			log.Fatal(err)
		}
	}

	seed := true
	if rawSeed := os.Getenv("CLASSDRIVE_SEED"); rawSeed != "" {
		parsedSeed, err := strconv.ParseBool(rawSeed)
		if err != nil {
			log.Fatalf("invalid CLASSDRIVE_SEED: %v", err)
		}
		seed = parsedSeed
	}

	port, hasSavedPort := savedConfiguredPort(baseDir)
	if !hasSavedPort {
		port = defaultPort()
	}
	if !hasSavedPort && os.Getenv("CLASSDRIVE_PORT") != "" {
		envPort := os.Getenv("CLASSDRIVE_PORT")
		port = envPort
	}
	if normalizedPort, ok := normalizePort(port); ok {
		port = normalizedPort
	} else {
		log.Fatalf("invalid CLASSDRIVE_PORT: %s", port)
	}

	handler, err := server.New(server.Config{
		BaseDir: baseDir,
		Seed:    seed,
	})
	if err != nil {
		log.Fatal(err)
	}

	app, ok := handler.(*server.App)
	if ok {
		defer func() {
			if closeErr := app.Close(); closeErr != nil {
				log.Printf("close app: %v", closeErr)
			}
		}()
	}

	runtimeServer := newRuntimeHTTPServer(handler)
	if app != nil {
		app.SetServerPortChangeHandler(runtimeServer.preparePortChange)
	}
	if err := runtimeServer.start(port); err != nil {
		log.Fatal(listenErrorMessage(port, err))
	}
	log.Print(startupCredentialsMessage())
	if err := runtimeServer.wait(); err != nil {
		log.Fatal(listenErrorMessage(runtimeServer.currentPort(), err))
	}
}
