export const config = {
  runtime: 'nodejs',
};

type TempleId = 'seocho' | 'mungyeong' | 'jukrim';

interface StoredPlayer {
  id: string;
  clientKey: string;
  nickname: string;
  templeId: TempleId;
  x: number;
  y: number;
  z: number;
  rotY: number;
  action: string;
  isMoving: boolean;
  robeColor: number;
  lastSeen: number;
}

const MAX_CONCURRENT_USERS = 100;
const PLAYER_TTL_MS = 20000;
const REDIS_HASH_KEY = 'jungto:metaverse:players:v1';

const ROBE_PALETTE = [
  0x787d82,
  0x8c8273,
  0x6b776e,
  0x707b84,
  0x877a6e,
  0x5f6b69,
  0x847e78,
];

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store, max-age=0',
};

function sanitizeNickname(raw: unknown): string {
  if (typeof raw !== 'string') return '수행자';
  const cleaned = raw.replace(/[\r\n\t<>]/g, '').trim().slice(0, 12);
  return cleaned || '수행자';
}

function sanitizeClientKey(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48);
}

function sanitizeTempleId(raw: unknown): TempleId {
  if (raw === 'seocho' || raw === 'mungyeong' || raw === 'jukrim') return raw;
  return 'mungyeong';
}

function clampCoord(val: unknown, fallback = 0): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return fallback;
  return Math.max(-130, Math.min(130, val));
}

function hashColorIndex(clientKey: string): number {
  let hash = 0;
  for (let i = 0; i < clientKey.length; i++) {
    hash = (hash * 31 + clientKey.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % ROBE_PALETTE.length;
}

function getMemoryStore(): Map<string, StoredPlayer> {
  const g = globalThis as unknown as {
    __jungtoVercelPlayers?: Map<string, StoredPlayer>;
  };
  if (!g.__jungtoVercelPlayers) {
    g.__jungtoVercelPlayers = new Map<string, StoredPlayer>();
  }
  return g.__jungtoVercelPlayers;
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

async function redisCommand(
  redis: { url: string; token: string },
  commands: unknown[][]
): Promise<Array<{ result?: unknown; error?: string }>> {
  const res = await fetch(`${redis.url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${redis.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  });
  if (!res.ok) {
    throw new Error(`Redis REST error: ${res.status}`);
  }
  return (await res.json()) as Array<{ result?: unknown; error?: string }>;
}

function parseRedisHash(raw: unknown): Map<string, StoredPlayer> {
  const map = new Map<string, StoredPlayer>();
  if (Array.isArray(raw)) {
    for (let i = 0; i < raw.length - 1; i += 2) {
      const k = String(raw[i]);
      const v = raw[i + 1];
      if (typeof v === 'string') {
        try {
          const parsed = JSON.parse(v) as StoredPlayer;
          if (parsed && parsed.clientKey) map.set(k, parsed);
        } catch {
          // ignore malformed entry
        }
      }
    }
  } else if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v === 'string') {
        try {
          const parsed = JSON.parse(v) as StoredPlayer;
          if (parsed && parsed.clientKey) map.set(k, parsed);
        } catch {
          // ignore
        }
      }
    }
  }
  return map;
}

function toPublicPlayer(p: StoredPlayer) {
  return {
    id: p.id,
    clientKey: p.clientKey,
    nickname: p.nickname,
    templeId: p.templeId,
    x: p.x,
    y: p.y,
    z: p.z,
    rotY: p.rotY,
    action: p.action,
    isMoving: p.isMoving,
    robeColor: p.robeColor,
  };
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const clientKey = sanitizeClientKey(body.clientKey);
  if (!clientKey) {
    return Response.json(
      { error: 'CLIENT_KEY_REQUIRED' },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const now = Date.now();
  const redis = getRedisConfig();
  let allMap: Map<string, StoredPlayer>;
  const expiredKeys: string[] = [];

  if (redis) {
    try {
      const [hgetRes] = await redisCommand(redis, [['HGETALL', REDIS_HASH_KEY]]);
      allMap = parseRedisHash(hgetRes?.result);
    } catch {
      allMap = getMemoryStore();
    }
  } else {
    allMap = getMemoryStore();
  }

  for (const [k, entry] of allMap.entries()) {
    if (!entry || now - entry.lastSeen > PLAYER_TTL_MS) {
      allMap.delete(k);
      expiredKeys.push(k);
    }
  }

  const existing = allMap.get(clientKey);
  if (!existing && allMap.size >= MAX_CONCURRENT_USERS) {
    return Response.json(
      {
        error: 'ROOM_FULL',
        maxUsers: MAX_CONCURRENT_USERS,
        message: `현재 동시 접속 인원(${MAX_CONCURRENT_USERS}명)이 가득 찼습니다.`,
      },
      { status: 429, headers: CORS_HEADERS }
    );
  }

  const entry: StoredPlayer = {
    id: existing?.id || `p-v-${clientKey}`,
    clientKey,
    nickname: sanitizeNickname(body.nickname),
    templeId: sanitizeTempleId(body.templeId),
    x: clampCoord(body.x, 0),
    y: clampCoord(body.y, 0),
    z: clampCoord(body.z, 18),
    rotY: typeof body.rotY === 'number' && Number.isFinite(body.rotY) ? body.rotY : 0,
    action: typeof body.action === 'string' ? body.action.slice(0, 20) : 'idle',
    isMoving: Boolean(body.isMoving),
    robeColor: existing?.robeColor ?? ROBE_PALETTE[hashColorIndex(clientKey)],
    lastSeen: now,
  };

  allMap.set(clientKey, entry);

  if (redis) {
    const cmds: unknown[][] = [
      ['HSET', REDIS_HASH_KEY, clientKey, JSON.stringify(entry)],
      ['EXPIRE', REDIS_HASH_KEY, 300],
    ];
    if (expiredKeys.length > 0) {
      cmds.push(['HDEL', REDIS_HASH_KEY, ...expiredKeys]);
    }
    try {
      await redisCommand(redis, cmds);
    } catch {
      // Fallback already recorded in memory map if Redis transient error
      getMemoryStore().set(clientKey, entry);
    }
  }

  const active = Array.from(allMap.values());
  const players = active
    .filter((p) => p.templeId === entry.templeId && p.id !== entry.id)
    .map(toPublicPlayer);

  const allPlayersSummary = active.map((p) => ({
    id: p.id,
    nickname: p.nickname,
    templeId: p.templeId,
    x: p.x,
    y: p.y,
    z: p.z,
    action: p.action,
  }));

  return Response.json(
    {
      selfId: entry.id,
      totalOnline: active.length,
      maxUsers: MAX_CONCURRENT_USERS,
      players,
      allPlayersSummary,
    },
    { status: 200, headers: CORS_HEADERS }
  );
}
