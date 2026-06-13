# ClassDrive 开发文档 - 分享功能技术架构

本文档面向开发者，详细说明老师资料分享功能的技术实现。

---

## 技术栈

- **后端**: Go 1.21+, SQLite3
- **前端**: Vue 3, TypeScript, Pinia, Vue Router
- **测试**: Go testing, Vitest
- **安全**: bcrypt, HttpOnly Cookie

---

## 数据库设计

### library_shares 表

```sql
create table if not exists library_shares (
    id integer primary key autoincrement,
    token text not null unique,
    access_code_hash text,
    entry_id integer not null,
    permission text not null check(permission in ('view', 'download')),
    expires_at text,
    disabled integer not null default 0,
    created_by_teacher_id integer not null,
    created_at text not null,
    updated_at text not null,
    last_accessed_at text,
    access_count integer not null default 0,
    
    foreign key (entry_id) references files(id) on delete cascade,
    foreign key (created_by_teacher_id) references teachers(id) on delete cascade
);

create unique index if not exists idx_library_shares_token 
    on library_shares (token);
create index if not exists idx_library_shares_entry 
    on library_shares (entry_id);
create index if not exists idx_library_shares_teacher 
    on library_shares (created_by_teacher_id);
```

**字段说明**：

- `token`: 分享唯一标识，16 字节随机生成，base64url 编码
- `access_code_hash`: 安全码的 bcrypt 哈希值（cost 10），NULL 表示无需安全码
- `entry_id`: 分享的文件或文件夹 ID（外键关联 files 表）
- `permission`: 访问权限，`view`（仅查看）或 `download`（允许下载）
- `expires_at`: 过期时间（ISO 8601 格式），NULL 表示永久有效
- `disabled`: 停用标志，1 表示已停用
- `created_by_teacher_id`: 创建分享的教师 ID
- `created_at`, `updated_at`: 创建和更新时间
- `last_accessed_at`: 最后访问时间
- `access_count`: 访问次数计数器

**级联删除**：
- 源文件/文件夹删除时，分享记录同步删除
- 教师账号删除时，其创建的分享同步删除

---

## 后端架构

### API 路由设计

#### 教师端 API

```go
// 分享 CRUD
POST   /api/library-shares          // 创建分享
GET    /api/library-shares          // 获取分享列表
PATCH  /api/library-shares/:id      // 更新分享
DELETE /api/library-shares/:id      // 删除分享
POST   /api/library-shares/:id/reset-code  // 重置安全码
```

**权限校验**：
- 需要教师登录
- 创建分享时强制校验 `entry.space = 'library'`
- 更新/删除时校验 `created_by_teacher_id = 当前教师ID`

#### 访客端 API

```go
// 分享访问
GET  /api/share/:token                    // 获取分享信息（无需验证）
POST /api/share/:token/verify             // 验证安全码
GET  /api/share/:token/items              // 浏览目录
GET  /api/share/:token/files/:id/preview  // 预览文件
GET  /api/share/:token/files/:id/download // 下载文件
GET  /api/share/:token/files/:id/archive  // 下载文件夹压缩包
```

**访问控制**：
- `/api/share/:token` 无需验证，返回基本信息
- 其他端点需要分享会话（通过安全码验证或无需安全码的分享）
- download/archive 端点额外检查 `permission = 'download'`

---

### 核心实现逻辑

#### 1. Token 生成

```go
func generateShareToken() (string, error) {
    b := make([]byte, 16)
    if _, err := rand.Read(b); err != nil {
        return "", err
    }
    return base64.RawURLEncoding.EncodeToString(b), nil
}
```

- 16 字节随机数（128 位熵）
- base64url 编码（URL 安全，无 padding）
- 唯一性由数据库 UNIQUE 约束保证

#### 2. 安全码生成与验证

**生成**：
```go
func generateAccessCode() string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    b := make([]byte, 6)
    for i := range b {
        b[i] = chars[rand.Intn(len(chars))]
    }
    return string(b)
}
```

**加密存储**：
```go
hash, err := bcrypt.GenerateFromPassword([]byte(accessCode), 10)
```

**验证**：
```go
err := bcrypt.CompareHashAndPassword(
    []byte(rec.AccessCodeHash), 
    []byte(inputCode),
)
```

#### 3. 分享会话管理

**发放 Cookie**：
```go
func (app *App) issueShareSession(w http.ResponseWriter, r *http.Request, rec *libraryShareRecord) error {
    sessionValue := generateRandomString(32)
    app.shareSessions.Store(rec.Token, sessionValue)
    
    http.SetCookie(w, &http.Cookie{
        Name:     "share_session_" + rec.Token,
        Value:    sessionValue,
        Path:     "/",
        HttpOnly: true,
        SameSite: http.SameSiteLaxMode,
        Secure:   r.TLS != nil,
    })
    return nil
}
```

**验证会话**：
```go
func (app *App) verifyShareSession(r *http.Request, token string) bool {
    cookie, err := r.Cookie("share_session_" + token)
    if err != nil {
        return false
    }
    expectedValue, ok := app.shareSessions.Load(token)
    return ok && cookie.Value == expectedValue
}
```

**内存存储**：
- 使用 `sync.Map` 存储会话映射：`token -> sessionValue`
- 服务重启后会话失效（可接受的权衡）

#### 4. 路径遍历防护

```go
func (app *App) validateSharePath(entryRoot *fileEntry, requestedPath string) (*fileEntry, error) {
    cleanPath := path.Clean("/" + requestedPath)
    
    // 检查路径是否在分享根目录下
    targetEntry, err := app.findEntryByPath(
        entryRoot.Space, 
        path.Join(entryRoot.Path, cleanPath),
    )
    if err != nil {
        return nil, errShareNotFound
    }
    
    // 确保目标路径是分享根目录的子路径
    if !strings.HasPrefix(targetEntry.Path, entryRoot.Path) {
        return nil, errShareNotFound
    }
    
    return targetEntry, nil
}
```

**防护措施**：
- 使用 `path.Clean()` 规范化路径，自动处理 `..`
- 验证目标路径必须在分享根目录下
- 拒绝任何越权访问尝试

#### 5. 状态检查

```go
func (app *App) resolveShareTarget(token string) (*libraryShareRecord, *fileEntry, error) {
    rec, err := app.getLibraryShareByToken(token)
    if err != nil {
        return nil, nil, err
    }
    
    // 检查是否停用
    if rec.Disabled {
        return nil, nil, errShareNotFound
    }
    
    // 检查是否过期
    if rec.ExpiresAt != "" {
        expires, _ := time.Parse(time.RFC3339, rec.ExpiresAt)
        if time.Now().After(expires) {
            return nil, nil, errShareNotFound
        }
    }
    
    // 检查源文件是否存在
    entry, ok := app.shareEntry(*rec)
    if !ok {
        return nil, nil, errShareNotFound
    }
    
    return rec, entry, nil
}
```

**检查项**：
- ✅ 分享是否停用（`disabled = 1`）
- ✅ 分享是否过期（`expires_at < now()`）
- ✅ 源文件是否存在（外键关联 + 手动查询）

---

## 前端架构

### Pinia Store

#### library-shares.ts

```typescript
export const useLibrarySharesStore = defineStore("library-shares", {
  state: () => ({
    shares: [] as LibraryShareItem[],
    loaded: false,
  }),
  
  actions: {
    async load(force = false) {
      if (this.loaded && !force) return;
      const response = await api.libraryShares();
      this.shares = response.shares;
      this.loaded = true;
    },
    
    async create(req: CreateLibraryShareRequest) {
      const result = await api.createLibraryShare(req);
      this.shares.push(result.share);
      return result;
    },
    
    async update(id: number, req: UpdateLibraryShareRequest) {
      const updated = await api.updateLibraryShare(id, req);
      const index = this.shares.findIndex(s => s.id === id);
      if (index !== -1) {
        this.shares[index] = updated;
      }
    },
    
    async remove(id: number) {
      await api.deleteLibraryShare(id);
      this.shares = this.shares.filter(s => s.id !== id);
    },
    
    async resetCode(id: number) {
      const result = await api.resetLibraryShareAccessCode(id);
      const index = this.shares.findIndex(s => s.id === id);
      if (index !== -1) {
        this.shares[index] = result.share;
      }
      return result;
    },
  },
});
```

**设计要点**：
- 懒加载：首次访问时加载，后续从缓存读取
- 乐观更新：操作成功后立即更新本地状态
- 错误处理：API 错误向上抛出，由组件处理

### 组件设计

#### ShareCreateDialog.vue

**职责**：创建分享的对话框

**Props**：
- `open: boolean` - 控制对话框显示
- `entry: FileItem | null` - 要分享的文件/文件夹

**Emits**：
- `close` - 关闭对话框

**状态机**：
```
未创建 → 创建中 → 创建成功
  ↓         ↓          ↓
表单    禁用按钮   显示结果
```

**关键逻辑**：
```typescript
async function handleSubmit() {
  const expiresAt = computeExpiresAt(); // 根据预设计算
  const created = await librarySharesStore.create({
    entryId: props.entry.id,
    permission: permission.value,
    requireAccessCode: requireAccessCode.value,
    expiresAt,
  });
  result.value = created; // 切换到结果展示
}
```

#### ShareManageDialog.vue

**职责**：分享列表和管理界面

**Props**：
- `open: boolean` - 控制对话框显示

**功能**：
- 加载和展示分享列表
- 复制分享信息
- 打开编辑对话框
- 停用/启用分享
- 删除分享（带二次确认）

**子组件**：
- `ShareEditDialog` - 编辑分享

#### ShareView.vue

**职责**：访客端分享访问页面

**路由**：`/share/:token`

**生命周期**：
```
加载分享信息 → 验证安全码（如需要）→ 展示内容
     ↓              ↓                    ↓
 显示基本信息    输入验证表单      文件预览/目录浏览
```

**关键逻辑**：
```typescript
// 加载分享信息
async function loadShareInfo() {
  const response = await api.shareInfo(token.value);
  shareInfo.value = response.info;
  
  if (!shareInfo.value.requiresAccessCode) {
    verified.value = true;
    if (shareInfo.value.entryKind === "dir") {
      await browse("");
    }
  }
}

// 验证安全码
async function handleVerify() {
  await api.verifyShareAccessCode(token.value, accessCode.value);
  verified.value = true;
  // Cookie 自动设置，后续请求自动带上
}

// 浏览目录
async function browse(path: string) {
  const response = await api.shareBrowse(token.value, path);
  items.value = response.items;
  currentPath.value = response.path;
}
```

---

## 操作日志集成

### 日志摘要生成

在 `server.go` 的 `enrichedOperationLogSummary` 函数中添加分支：

```go
func (app *App) enrichedOperationLogSummary(request *http.Request, actorType string, actorID int64) (string, bool) {
    segments := strings.Split(strings.Trim(request.URL.Path, "/"), "/")
    switch segments[1] {
    case "library-shares":
        return app.libraryShareOperationLogSummary(request.Method, segments, actorID)
    case "share":
        return app.shareAccessOperationLogSummary(request.Method, segments)
    // ... 其他分支
    }
}
```

### 教师端日志

```go
func (app *App) libraryShareOperationLogSummary(method string, segments []string, actorID int64) (string, bool) {
    if method == http.MethodPost && len(segments) == 2 {
        return "老师创建资料分享", true
    }
    if method == http.MethodPatch && len(segments) == 3 {
        share, _ := app.findLibraryShareByID(shareID, actorID)
        return "老师修改资料分享：" + share.entryName, true
    }
    // ... 其他操作
}
```

### 访客端日志

```go
func (app *App) shareAccessOperationLogSummary(method string, segments []string) (string, bool) {
    if method == http.MethodGet && len(segments) == 4 && segments[3] == "items" {
        share, _ := app.findShareByToken(token)
        return "访客查看分享：" + share.entryName, true
    }
    if method == http.MethodGet && segments[5] == "download" {
        share, _ := app.findShareByToken(token)
        return "访客下载分享文件：" + share.entryName, true
    }
    // ... 其他操作
}
```

**设计要点**：
- GET 列表操作不记录（避免日志膨胀）
- POST/PATCH/DELETE 操作必记录
- 访客端关键操作（浏览、下载）记录
- 查询失败不记录（`return "", false`）

---

## 安全设计

### 威胁模型

| 威胁 | 防护措施 |
|------|----------|
| Token 猜测 | 128 位随机熵，唯一性约束 |
| 安全码暴力破解 | bcrypt (cost 10)，6 位大写字母+数字（约 21 亿组合） |
| 会话劫持 | HttpOnly Cookie，SameSite=Lax |
| 权限越权 | 每次请求验证 `created_by_teacher_id`、`permission` |
| 路径遍历 | `path.Clean()` + 前缀检查 |
| XSS | 前端使用 Vue 自动转义，API 返回 JSON |
| CSRF | SameSite Cookie + 状态检查 |
| 过期分享访问 | 每次请求检查 `expires_at` |

### 最小权限原则

- **教师**：只能管理自己创建的分享
- **访客**：只能访问分享范围内的文件
- **view 权限**：禁止 `/download` 和 `/archive` 端点
- **download 权限**：允许所有操作

---

## 测试策略

### 后端单元测试

**文件**: `internal/server/library_shares_test.go`, `internal/server/library_share_access_test.go`

**覆盖场景**：
- ✅ 创建分享：仅 library 可创建，public/class 拒绝
- ✅ 更新分享：只能更新自己创建的
- ✅ 删除分享：同上
- ✅ 安全码验证：正确/错误/无需安全码
- ✅ 权限控制：view 权限禁止下载
- ✅ 状态检查：过期/停用/源文件删除均拒绝
- ✅ 路径遍历：`../` 攻击被拦截

**测试技巧**：
```go
func TestShareAccessWithExpiredShare(t *testing.T) {
    app := newTestApp(t)
    
    // 创建过期分享
    rec := createLibraryShare(t, app, teacherID, entryID, shareRequest{
        permission: "view",
        expiresAt:  time.Now().Add(-1 * time.Hour).Format(time.RFC3339),
    })
    
    // 尝试访问
    req := httptest.NewRequest("GET", "/api/share/"+rec.token, nil)
    w := httptest.NewRecorder()
    app.ServeHTTP(w, req)
    
    assert.Equal(t, http.StatusNotFound, w.Code)
}
```

### 前端单元测试

**文件**: `frontend/tests/share-view.spec.ts`, `frontend/tests/library-shares-store.spec.ts`

**覆盖场景**：
- ✅ ShareView：安全码验证流程
- ✅ ShareView：权限控制（下载按钮显示/隐藏）
- ✅ ShareView：目录浏览和导航
- ✅ ShareCreateDialog：表单验证和提交
- ✅ ShareManageDialog：列表展示和操作

**测试技巧**：
```typescript
it("verifies access code and shows file preview", async () => {
  vi.spyOn(api, "shareInfo").mockResolvedValue({ info: mockShare });
  vi.spyOn(api, "verifyShareAccessCode").mockResolvedValue({ ok: true });
  
  const wrapper = mount(ShareView, { /* ... */ });
  await flushPromises();
  
  await wrapper.get('[data-testid="share-access-code-input"]').setValue("ABC123");
  await wrapper.get("form").trigger("submit");
  await flushPromises();
  
  expect(wrapper.find('[data-testid="share-file-preview"]').exists()).toBe(true);
});
```

---

## 性能优化

### 数据库索引

- `token` 上的 UNIQUE 索引：O(log n) 查询
- `entry_id` 上的索引：快速查找某文件的所有分享
- `created_by_teacher_id` 上的索引：快速查询教师的分享列表

### 前端缓存

- Pinia store 缓存分享列表，避免重复请求
- 使用 `force` 参数控制强制刷新

### 会话管理

- 使用 `sync.Map` 提供线程安全的内存缓存
- 避免每次请求查询数据库验证会话

---

## 未来扩展

### 功能增强

- [ ] 分享访问记录详情（IP、UA、时间）
- [ ] 分享密码保护（除安全码外的额外密码）
- [ ] 分享访问次数限制
- [ ] 分享二维码生成
- [ ] 批量创建分享
- [ ] 分享模板（预设权限和有效期）

### 技术改进

- [ ] Redis 存储分享会话（支持水平扩展）
- [ ] 分享访问限流（防止滥用）
- [ ] CDN 加速文件预览和下载
- [ ] 大文件分片下载
- [ ] WebRTC P2P 传输（去中心化）

---

## 参考资源

- [bcrypt 规范](https://en.wikipedia.org/wiki/Bcrypt)
- [OWASP Path Traversal](https://owasp.org/www-community/attacks/Path_Traversal)
- [Vue 3 文档](https://vuejs.org/)
- [Pinia 文档](https://pinia.vuejs.org/)
- [SQLite 外键约束](https://www.sqlite.org/foreignkeys.html)
