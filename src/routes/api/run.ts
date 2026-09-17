// Bankr contract v1 — do not rename fields
import { createFileRoute } from "@tanstack/react-router";
import {
  authorized,
  clientIp,
  handleOptions,
  json,
  publicLink,
  rateLimitHandle,
  rateLimitIp,
} from "@/lib/api-guard";
import { normalizeHandle, runCap } from "@/lib/bankr-run";

async function handlePost({ request }: { request: Request }): Promise<Response> {
  const link = publicLink(request);

  if (!authorized(request)) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  const ip = clientIp(request);
  if (!rateLimitIp(ip)) {
    return json(
      {
        ok: false,
        error: "rate_limited",
        text: "Slow down — try again in a minute.",
        link,
      },
      429,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(
      {
        ok: false,
        error: "invalid_json",
        text: "Send JSON with a prompt.",
        link,
      },
      400,
    );
  }

  const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const prompt = typeof rec.prompt === "string" ? rec.prompt.trim() : "";
  if (!prompt) {
    return json({ ok: false, error: "missing_prompt" }, 400);
  }

  const handle = normalizeHandle(rec.handle);
  if (handle && !rateLimitHandle(handle)) {
    return json(
      {
        ok: false,
        error: "rate_limited",
        text: "Slow down — try again in a minute.",
        link,
      },
      429,
    );
  }

  const timestamp =
    typeof rec.timestamp === "number" && Number.isFinite(rec.timestamp)
      ? rec.timestamp
      : Date.now();

  console.info("[bankr]", { handle: handle ?? null, prompt });

  const result = runCap(prompt);
  if (!result.ok) {
    return json(
      {
        ok: false,
        text: result.text,
        error: result.error,
        link,
      },
      result.error === "missing_prompt" ? 400 : 422,
    );
  }

  return json(
    {
      ok: true,
      text: result.text,
      link,
      handle: handle ?? null,
      prompt: result.prompt,
      timestamp,
      data: {
        stamp: result.stamp,
        phrase: result.phrase,
        mode: result.mode,
        bg: result.bg,
        fg: result.fg,
        weight: result.weight,
        rows: result.rows,
        cols: result.cols,
        trigger: result.trigger,
        artBoard: result.artBoard,
      },
    },
    200,
  );
}

export const Route = createFileRoute("/api/run")({
  server: {
    handlers: {
      OPTIONS: handleOptions,
      POST: handlePost,
    },
  },
});
