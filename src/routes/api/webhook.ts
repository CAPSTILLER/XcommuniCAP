// XCAP webhook — Bankr / listener dispatch. Do not wrap reply text.
import { createFileRoute } from "@tanstack/react-router";
import {
  authorized,
  clientIp,
  CORS,
  handleOptions,
  json,
  publicLink,
  rateLimitHandle,
  rateLimitIp,
} from "@/lib/api-guard";
import { normalizeHandle, runCap } from "@/lib/bankr-run";
import { DENIED_TEXT, normalizeAddress, resolveGate } from "@/lib/gate";
import { parseTrigger } from "@/lib/trigger";
import { pickTweetId, replyToTweet } from "@/lib/x-reply";

function str(rec: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const v = rec[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function boolish(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes") return true;
    if (s === "false" || s === "0" || s === "no") return false;
  }
  return null;
}

function handleGet(): Response {
  return json(
    {
      ok: true,
      service: "xcap-webhook",
      trigger: "[fg][bg][word] e.g. 🟥⬛cap",
      listen: "mentions of @bankrbot that include https://xcap.grok.me",
    },
    200,
  );
}

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
        text: "Send JSON with input or fg/bg/word.",
        link,
      },
      400,
    );
  }

  const rec =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  const input =
    str(rec, "input", "prompt", "text", "raw") ||
    [str(rec, "fg"), str(rec, "bg"), str(rec, "word")].filter(Boolean).join("");

  const parsed = parseTrigger(input);
  const fg = str(rec, "fg", "foreground") || parsed?.fg || "";
  const bg = str(rec, "bg", "background") || parsed?.bg || "";
  const word = str(rec, "word", "stamp") || parsed?.word || "";

  if (!word && !input) {
    return json(
      {
        ok: false,
        error: "missing_prompt",
        text: "Need [fg][bg][word] e.g. 🟥⬛cap",
        link,
      },
      400,
    );
  }

  const handle = normalizeHandle(rec.handle ?? rec.user ?? rec.from);
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

  const userAddress = normalizeAddress(
    str(rec, "userAddress", "user_address", "wallet", "address") || null,
  );
  const gateAuthorized = boolish(rec.gateAuthorized ?? rec.gate_authorized);

  console.info("[xcap-webhook]", {
    handle: handle ?? null,
    input,
    word,
    userAddress,
    gateAuthorized,
  });

  const gate = await resolveGate({ userAddress, gateAuthorized });
  if (!gate.allowed) {
    const tweetId = pickTweetId(rec);
    let postedToX = false;
    if (tweetId) {
      const posted = await replyToTweet(tweetId, DENIED_TEXT);
      postedToX = posted.ok === true;
    }
    return json(
      {
        ok: false,
        error: "gate_denied",
        text: DENIED_TEXT,
        link,
        handle: handle ?? null,
        userAddress,
        gateAuthorized: false,
        postedToX,
      },
      200,
    );
  }

  const providedBoard =
    typeof rec.artBoard === "string" && rec.artBoard.includes("\n")
      ? rec.artBoard.replace(/\r\n/g, "\n").trimEnd()
      : "";

  const result = runCap(input || word, {
    fg: fg || undefined,
    bg: bg || undefined,
    word: word || undefined,
    artOnly: true,
  });

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

  const artBoard = providedBoard || result.artBoard;
  const tweetId = pickTweetId(rec);
  let postedToX = false;
  let xError: string | undefined;
  if (tweetId) {
    const posted = await replyToTweet(tweetId, artBoard);
    if (posted.ok) postedToX = true;
    else if (!posted.skipped) xError = posted.error;
  }

  return json(
    {
      ok: true,
      text: artBoard,
      link,
      handle: handle ?? null,
      input,
      fg: result.fg,
      bg: result.bg,
      word: result.stamp,
      dimensions: { rows: 7, cols: 19 },
      artBoard,
      userAddress,
      gateAuthorized: true,
      openAccess: gate.open,
      tweetId,
      postedToX,
      ...(xError ? { xError } : {}),
      data: {
        stamp: result.stamp,
        weight: result.weight,
        rows: 7,
        cols: 19,
      },
    },
    200,
    CORS,
  );
}

export const Route = createFileRoute("/api/webhook")({
  server: {
    handlers: {
      OPTIONS: handleOptions,
      GET: handleGet,
      POST: handlePost,
    },
  },
});
