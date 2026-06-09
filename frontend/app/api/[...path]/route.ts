import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";
export const preferredRegion = "auto";

// BACKEND_API_URL must be set in Vercel → Settings → Environment Variables.
// Value: your Railway service URL (no trailing slash).
// If missing, all API calls return 502.

const BACKEND_API_URL = (process.env.BACKEND_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "expect",           // undici (Node.js fetch) doesn't support Expect: 100-continue
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

function buildTargetUrl(request: NextRequest, path: string[]): string {
  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(`${BACKEND_API_URL}/${path.join("/")}`);
  targetUrl.search = incomingUrl.search;
  return targetUrl.toString();
}

function copyRequestHeaders(request: NextRequest): Headers {
  const headers = new Headers(request.headers);

  for (const header of HOP_BY_HOP_HEADERS) {
    headers.delete(header);
  }

  headers.delete("host");
  return headers;
}

function copyResponseHeaders(response: Response): Headers {
  const headers = new Headers(response.headers);

  for (const header of HOP_BY_HOP_HEADERS) {
    headers.delete(header);
  }

  return headers;
}

async function proxyRequest(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { path = [] } = await context.params;
  const targetUrl = buildTargetUrl(request, path);

  try {
    const init: RequestInit = {
      method: request.method,
      headers: copyRequestHeaders(request),
      cache: "no-store",
      redirect: "manual",
    };

    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = await request.arrayBuffer();
    }

    const upstream = await fetch(targetUrl, init);
    if (upstream.headers.get("content-type")?.includes("text/event-stream")) {
      const headers = copyResponseHeaders(upstream);
      headers.set("content-type", "text/event-stream");
      headers.set("cache-control", "no-cache, no-transform");
      headers.set("x-accel-buffering", "no");
      return new NextResponse(upstream.body, {
        status: upstream.status,
        headers,
      });
    }
    const body =
      request.method === "HEAD" || upstream.status === 204 || upstream.status === 304
        ? null
        : upstream.body;

    return new NextResponse(body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: copyResponseHeaders(upstream),
    });
  } catch (error) {
    console.error("[api-proxy] backend request failed", { targetUrl, error });

    return NextResponse.json(
      {
        detail: "Backend API is not responding. Check the Railway service logs and environment variables.",
      },
      { status: 502 }
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const OPTIONS = proxyRequest;
export const HEAD = proxyRequest;
