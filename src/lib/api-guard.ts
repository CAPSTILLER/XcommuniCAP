import { timingSafeEqual } from "node:crypto";

export const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS, GET",
  "access-control-allow-headers":
    "Content-Type, X-Shared-Secret, Authorization",
  "access-control-max-age": "600",
} as const;

/** Bankr shared secret — exact string, case-sensitive, no quotes. */
export const BANKR_SHARED_SECRET = "Peanut_Deep_In_Deez_Nutz";

export function sharedSecret(): string {
  return BANKR_SHARED_SECRET;
}

export function secretsEqual(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function authorized(request: Request): boolean {
  const expected = BANKR_SHARED_SECRET;
  const header = (request.headers.get("x-shared-secret") ?? "").trim();
  const authorization = (request.headers.get("authorization") ?? "").trim();
  const bearer = /^bearer\s+/i.test(authorization)
    ? authorization.replace(/^bearer\s+/i, "").trim()
    : "";
  return secretsEqual(header, expected) || secretsEqual(bearer, expected);
}

export function publicLink(request: Request): string {
  const env =
    process.env.APP_PUBLIC_URL ||
    process.env.PUBLIC_URL ||
    process.env.ORIGIN;
  if (env) return `${env.replace(/\/$/, "")}/`;
  try {
    return `${new URL(request.url).origin}/`;
  } catch {
    return "/";
  }
}

export function json(
  body: unknown,
  status: number,
  extra?: HeadersInit,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...CORS,
      ...extra,
    },
  });
}

export function handleOptions(): Response {
  return new Response(null, { status: 204, headers: { ...CORS } });
}

const WINDOW_MS = 60_000;
const ipHits = new Map<string, number[]>();
const handleHits = new Map<string, number[]>();

function allow(
  map: Map<string, number[]>,
  key: string,
  limit: number,
): boolean {
  const now = Date.now();
  const next = (map.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (next.length >= limit) {
    map.set(key, next);
    return false;
  }
  next.push(now);
  map.set(key, next);
  return true;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

export function rateLimitIp(ip: string): boolean {
  return allow(ipHits, ip, 30);
}

export function rateLimitHandle(handle: string): boolean {
  return allow(handleHits, handle.toLowerCase(), 10);
}
