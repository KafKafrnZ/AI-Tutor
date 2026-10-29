// DO NOT add "set-cookie" here. Cookie forwarding is load-bearing.
// access_token and refresh_token must be forwarded back to the browser.
export const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "expect", // undici (Node.js fetch) doesn't support Expect: 100-continue
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

export function copyResponseHeaders(response: Response): Headers {
  const headers = new Headers(response.headers);

  for (const header of HOP_BY_HOP_HEADERS) {
    headers.delete(header);
  }

  return headers;
}

export const JSON_PROXY_TIMEOUT_MS = 130_000;

export function proxyAbortSignal(path: string[]): AbortSignal | undefined {
  if (path.includes("stream")) return undefined;
  return AbortSignal.timeout(JSON_PROXY_TIMEOUT_MS);
}

export function backendUnreachableBody() {
  return {
    error: {
      code: "BACKEND_UNREACHABLE",
      message: "The tutor service is not responding. Please try again.",
    },
  };
}
