export type ParsedSseLine = {
  token?: string;
  done?: boolean;
  error?: string;
};

export function readSsePayload(line: string): string | null {
  const normalizedLine = line.endsWith("\r") ? line.slice(0, -1) : line;

  if (normalizedLine.startsWith("data: ")) {
    return normalizedLine.slice(6);
  }

  if (normalizedLine.startsWith("data:")) {
    return normalizedLine.slice(5);
  }

  return null;
}

export function parseSseLine(line: string): ParsedSseLine {
  const payload = readSsePayload(line);
  if (payload === null || payload.length === 0) return {};
  if (payload === "[DONE]") return { done: true };

  try {
    const parsed: unknown = JSON.parse(payload);

    if (typeof parsed === "string") return { token: parsed };

    if (parsed && typeof parsed === "object") {
      if ("token" in parsed && typeof (parsed as { token?: unknown }).token === "string") {
        return { token: (parsed as { token: string }).token };
      }

      if ("data" in parsed && typeof (parsed as { data?: unknown }).data === "string") {
        return { token: (parsed as { data: string }).data };
      }
    }

    return {};
  } catch {
    // Backend sent a raw (non-JSON) string token — treat the entire payload as the token.
    // This handles FastAPI/sse-starlette streams that yield plain strings without JSON wrapping.
    return payload.trim() ? { token: payload } : {};
  }
}
