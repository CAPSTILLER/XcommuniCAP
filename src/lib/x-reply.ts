import { createHmac, randomBytes } from "node:crypto";

const TWEET_URL = "https://api.x.com/2/tweets";

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function xCredentials(): {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessSecret: string;
} | null {
  const apiKey = env("X_API_KEY") || env("TWITTER_API_KEY");
  const apiSecret = env("X_API_SECRET") || env("TWITTER_API_SECRET");
  const accessToken = env("X_ACCESS_TOKEN") || env("TWITTER_ACCESS_TOKEN");
  const accessSecret =
    env("X_ACCESS_TOKEN_SECRET") || env("TWITTER_ACCESS_TOKEN_SECRET");
  if (!apiKey || !apiSecret || !accessToken || !accessSecret) return null;
  return { apiKey, apiSecret, accessToken, accessSecret };
}

export function xPostRepliesEnabled(): boolean {
  const flag = env("X_POST_REPLIES").toLowerCase();
  if (flag === "0" || flag === "false" || flag === "no") return false;
  return xCredentials() !== null;
}

function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function oauthHeader(
  method: string,
  url: string,
  creds: NonNullable<ReturnType<typeof xCredentials>>,
): string {
  const oauth: Record<string, string> = {
    oauth_consumer_key: creds.apiKey,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: creds.accessToken,
    oauth_version: "1.0",
  };
  const paramStr = Object.keys(oauth)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(oauth[k]!)}`)
    .join("&");
  const base = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(paramStr),
  ].join("&");
  const signingKey = `${percentEncode(creds.apiSecret)}&${percentEncode(creds.accessSecret)}`;
  oauth.oauth_signature = createHmac("sha1", signingKey)
    .update(base)
    .digest("base64");
  return (
    "OAuth " +
    Object.keys(oauth)
      .sort()
      .map((k) => `${percentEncode(k)}="${percentEncode(oauth[k]!)}"`)
      .join(", ")
  );
}

export function pickTweetId(rec: Record<string, unknown>): string | null {
  const keys = [
    "tweetId",
    "tweet_id",
    "inReplyToTweetId",
    "in_reply_to_tweet_id",
    "mentionId",
    "mention_id",
  ];
  for (const key of keys) {
    const v = rec[key];
    if (typeof v === "string" && /^\d+$/.test(v.trim())) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  const tweet = rec.tweet;
  if (tweet && typeof tweet === "object") {
    const id = (tweet as { id?: unknown }).id;
    if (typeof id === "string" && /^\d+$/.test(id)) return id;
  }
  return null;
}

export type XReplyResult =
  | { ok: true; id: string }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped: false; error: string };

export async function replyToTweet(
  tweetId: string,
  text: string,
): Promise<XReplyResult> {
  if (!xPostRepliesEnabled()) {
    return { ok: false, skipped: true, reason: "x_post_disabled" };
  }
  const creds = xCredentials();
  if (!creds) {
    return { ok: false, skipped: true, reason: "missing_x_credentials" };
  }
  const auth = oauthHeader("POST", TWEET_URL, creds);
  const res = await fetch(TWEET_URL, {
    method: "POST",
    headers: {
      authorization: auth,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      text,
      reply: { in_reply_to_tweet_id: tweetId },
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    data?: { id?: string };
    detail?: string;
    title?: string;
  };
  if (!res.ok || !body.data?.id) {
    const error = body.detail || body.title || `x api ${res.status}`;
    console.warn("[x-reply]", error);
    return { ok: false, skipped: false, error };
  }
  return { ok: true, id: body.data.id };
}
