const BLOCKED_HOSTNAMES = new Set(['localhost', '0.0.0.0', '::1']);

function isPrivateIPv4(hostname: string): boolean {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  const [a, b] = [Number(match[1]), Number(match[2])];
  if (a === 127) return true; // loopback
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 169 && b === 254) return true; // link-local
  return false;
}

/**
 * Best-effort SSRF guard: rejects obviously local/private hostnames.
 * Not a full defense (no DNS-rebinding protection) — a reasonable first layer
 * given webhook URLs are admin-managed, not attacker-supplied at request time.
 */
export function isBlockedWebhookHost(url: string): boolean {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return true;
  }
  if (BLOCKED_HOSTNAMES.has(hostname)) return true;
  if (hostname.endsWith('.localhost')) return true;
  if (isPrivateIPv4(hostname)) return true;
  return false;
}
