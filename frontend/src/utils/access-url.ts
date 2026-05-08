export function formatAccessUrl(host: string, port: string): string {
  const normalizedHost = host.trim() || "127.0.0.1";
  const normalizedPort = port.trim();
  if (!normalizedPort || normalizedPort === "80") {
    return `http://${normalizedHost}/`;
  }
  return `http://${normalizedHost}:${normalizedPort}/`;
}
