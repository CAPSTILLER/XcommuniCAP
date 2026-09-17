/** xCAPunicated_UR_GAted on Base — isUserAuthorized(address) */
export const GATE_CONTRACT =
  "0xff575c0db04b1b07a4e6b455fb87fdc660063840" as const;

const SELECTOR = "894e5f2d"; // keccak256("isUserAuthorized(address)")[:4]
const ZERO = "0x0000000000000000000000000000000000000000";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export const DENIED_TEXT =
  "access denied: wallet does not hold required xcap gating token";

export function normalizeAddress(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!ADDRESS_RE.test(trimmed)) return null;
  if (trimmed.toLowerCase() === ZERO.toLowerCase()) return null;
  return trimmed;
}

function rpcUrl(): string {
  return (
    process.env.BASE_RPC_URL?.trim() ||
    process.env.BASE_RPC?.trim() ||
    "https://mainnet.base.org"
  );
}

function callData(address: string): string {
  const addr = address.slice(2).toLowerCase().padStart(64, "0");
  return `0x${SELECTOR}${addr}`;
}

export async function isUserAuthorized(address: string): Promise<boolean> {
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_call",
    params: [{ to: GATE_CONTRACT, data: callData(address) }, "latest"],
  };
  const res = await fetch(rpcUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "xcommunicap/1.0",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`base rpc ${res.status}`);
  }
  const json = (await res.json()) as { result?: string; error?: { message?: string } };
  if (json.error?.message) throw new Error(json.error.message);
  const result = (json.result ?? "").replace(/^0x/, "");
  if (!result) return false;
  return BigInt(`0x${result}`) !== 0n;
}

/**
 * true  → post the board
 * false → denial
 * null  → open access (no wallet, no explicit deny)
 */
export async function resolveGate(opts: {
  userAddress?: string | null;
  gateAuthorized?: boolean | null;
}): Promise<{ allowed: boolean; open: boolean; checked: boolean }> {
  if (opts.gateAuthorized === false) {
    return { allowed: false, open: false, checked: false };
  }

  const address = normalizeAddress(opts.userAddress ?? null);
  if (!address) {
    if (opts.gateAuthorized === true) {
      return { allowed: true, open: false, checked: false };
    }
    return { allowed: true, open: true, checked: false };
  }

  try {
    const ok = await isUserAuthorized(address);
    return { allowed: ok, open: false, checked: true };
  } catch (err) {
    console.warn("[gate] rpc failed", err);
    if (opts.gateAuthorized === true) {
      return { allowed: true, open: false, checked: false };
    }
    return { allowed: false, open: false, checked: false };
  }
}
