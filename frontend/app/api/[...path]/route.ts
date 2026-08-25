import { NextRequest, NextResponse } from "next/server";
import { copyResponseHeaders, backendUnreachableBody, HOP_BY_HOP_HEADERS } from "@/lib/bff-proxy";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";
export const preferredRegion = "auto";

// BACKEND_API_URL must be set in Vercel → Settings → Environment Variables.
// Value: your Railway service URL (no trailing slash).
// If missing / unreachable, this route returns 502 BACKEND_UNREACHABLE.
// Cookie names access_token and refresh_token must be forwarded (do not
// put set-cookie in HOP_BY_HOP_HEADERS).

const BACKEND_API_URL = (process.env.BACKEND_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

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

    const upstream = await fetch(targetUrl, {
      ...init,
      signal: AbortSignal.timeout(55000),
    });
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
    return NextResponse.json(backendUnreachableBody(), { status: 502 });
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const OPTIONS = proxyRequest;
export const HEAD = proxyRequest;
