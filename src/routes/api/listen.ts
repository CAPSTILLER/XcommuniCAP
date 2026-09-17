// X mention poller — Bankr is the primary listener. This runs only when
// X_BEARER_TOKEN is set, matching @bankrbot mentions that include xcap.grok.me.
import { createFileRoute } from "@tanstack/react-router";
import {
  authorized,
  handleOptions,
  json,
} from "@/lib/api-guard";
import { parseTrigger } from "@/lib/trigger";
import { xCredentials } from "@/lib/x-reply";

const QUERY = "@bankrbot (url:xcap.grok.me OR xcap.grok.me)";
const SEARCH_URL = "https://api.x.com/2/tweets/search/recent";

function bearer(): string {
  return (
    process.env.X_BEARER_TOKEN?.trim() ||
    process.env.TWITTER_BEARER_TOKEN?.trim() ||
    ""
  );
}

function handleGet(): Response {
  return json(
    {
      ok: true,
      listener: "bankr",
      pattern: "@bankrbot + https://xcap.grok.me + [fg][bg][word]",
      dispatch: "/api/webhook",
      pollEnabled: Boolean(bearer()),
      xUserContext: xCredentials() !== null,
    },
    200,
  );
}

async function handlePost({ request }: { request: Request }): Promise<Response> {
  if (!authorized(request)) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  const token = bearer();
  if (!token) {
    return json(
      {
        ok: true,
        skipped: true,
        reason: "bankr_is_listener",
        hint: "Bankr should POST matching mentions to /api/webhook. Set X_BEARER_TOKEN only if this host should poll X search itself.",
      },
      200,
    );
  }

  const url = new URL(SEARCH_URL);
  url.searchParams.set("query", QUERY);
  url.searchParams.set("max_results", "10");
  url.searchParams.set("tweet.fields", "author_id,text,created_at,conversation_id");

  const res = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
  });
  const body = (await res.json().catch(() => ({}))) as {
    data?: { id: string; text: string; author_id?: string }[];
    title?: string;
    detail?: string;
  };
  if (!res.ok) {
    return json(
      {
        ok: false,
        error: "x_search_failed",
        text: body.detail || body.title || `x api ${res.status}`,
      },
      502,
    );
  }

  const tweets = body.data ?? [];
  const matched = tweets
    .map((t) => ({ ...t, trigger: parseTrigger(t.text) }))
    .filter((t) => t.trigger);

  return json(
    {
      ok: true,
      scanned: tweets.length,
      matched: matched.length,
      tweets: matched.map((t) => ({
        tweetId: t.id,
        text: t.text,
        trigger: t.trigger,
      })),
      hint: "POST each match to /api/webhook with tweetId + input to stamp and reply.",
    },
    200,
  );
}

export const Route = createFileRoute("/api/listen")({
  server: {
    handlers: {
      OPTIONS: handleOptions,
      GET: handleGet,
      POST: handlePost,
    },
  },
});
