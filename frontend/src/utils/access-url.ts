function normalizeProtocol(protocol: string | undefined): "http" | "https" {
  return protocol === "https:" || protocol === "https" ? "https" : "http";
}

export function formatAccessUrl(host: string, port: string, protocol?: string): string {
  const normalizedHost = host.trim() || "127.0.0.1";
  const normalizedPort = port.trim();
  const normalizedProtocol = normalizeProtocol(protocol ?? (typeof window === "undefined" ? undefined : window.location.protocol));
  const defaultPort = normalizedProtocol === "https" ? "443" : "80";
  if (!normalizedPort || normalizedPort === defaultPort) {
    return `${normalizedProtocol}://${normalizedHost}/`;
  }
  return `${normalizedProtocol}://${normalizedHost}:${normalizedPort}/`;
}
