export const config = {
  runtime: 'nodejs',
};

const MAX_CONCURRENT_USERS = 100;
const PLAYER_TTL_MS = 20000;
const REDIS_HASH_KEY = 'jungto:metaverse:players:v1';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store, max-age=0',
};

interface StoredPresence {
  lastSeen?: number;
}

function getMemoryStore(): Map<string, StoredPresence> {
  const g = globalThis as unknown as {
    __jungtoVercelPlayers?: Map<string, StoredPresence>;
  };
  return g.__jungtoVercelPlayers || new Map();
}

function getRedisConfig(): { url: string; token: string } | null {
  const env = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } })
    .process?.env;
  if (!env) return null;
  const url = (env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL || '').trim().replace(/\/+$/, '');
  const token = (env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN || '').trim();
  if (!url || !token) return null;
  return { url, token };
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(): Promise<Response> {
  const now = Date.now();
  const redis = getRedisConfig();
  let onlineCount = 0;

  if (redis) {
    try {
      const res = await fetch(`${redis.url}/hgetall/${encodeURIComponent(REDIS_HASH_KEY)}`, {
        headers: { Authorization: `Bearer ${redis.token}` },
      });
      if (res.ok) {
        const json = (await res.json()) as { result?: unknown };
        const raw = json.result;
        if (Array.isArray(raw)) {
          for (let i = 1; i < raw.length; i += 2) {
            try {
              const parsed = JSON.parse(String(raw[i])) as StoredPresence;
              if (parsed.lastSeen && now - parsed.lastSeen <= PLAYER_TTL_MS) {
                onlineCount += 1;
              }
            } catch {
              // ignore
            }
          }
          return Response.json(
            { onlineCount, maxUsers: MAX_CONCURRENT_USERS },
            { status: 200, headers: CORS_HEADERS }
          );
        }
      }
    } catch {
      // fall through to memory count
    }
  }

  const mem = getMemoryStore();
  for (const [k, v] of mem.entries()) {
    if (!v.lastSeen || now - v.lastSeen > PLAYER_TTL_MS) {
      mem.delete(k);
    } else {
      onlineCount += 1;
    }
  }

  return Response.json(
    { onlineCount, maxUsers: MAX_CONCURRENT_USERS },
    { status: 200, headers: CORS_HEADERS }
  );
}
