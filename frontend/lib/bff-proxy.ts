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

export function backendUnreachableBody() {
  return {
    error: {
      code: "BACKEND_UNREACHABLE",
      message: "The tutor service is not responding. Please try again.",
    },
  };
}
