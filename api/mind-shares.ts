export const config = {
  runtime: 'nodejs',
};

export interface MindSharePostDTO {
  id: string;
  author: string;
  templeStayLocation: string;
  emotionTag: '평온' | '감사' | '알아차림' | '내려놓음' | '참회';
  content: string;
  timestamp: string;
  lotusCount: number;
  createdAt?: number;
}

interface StoredMindPost {
  id: string;
  author: string;
  templeStayLocation: string;
  emotionTag: '평온' | '감사' | '알아차림' | '내려놓음' | '참회';
  content: string;
  createdAt: number;
  baseLotus: number;
}

const REDIS_POSTS_HASH = 'jungto:mind:posts:v1';
const REDIS_CHEERS_HASH = 'jungto:mind:cheers:v1';
const MAX_DYNAMIC_POSTS = 100;

const VALID_EMOTIONS = ['평온', '감사', '알아차림', '내려놓음', '참회'] as const;

const SEED_POSTS: MindSharePostDTO[] = [
  {
    id: 'post-1',
    author: '맑은바람 도반',
    templeStayLocation: 'M 수련원 묵언스테이',
    emotionTag: '내려놓음',
    content:
      '문경 희양산 자락에서 스마트폰을 맡겨두고 이틀째를 보냈습니다. 처음엔 손이 허전하고 불안했는데, 계곡물 소리를 들으며 108배를 마치고 나니 그동안 얼마나 많은 불필요한 정보와 타인의 시선에 갇혀 살았는지 뼈저리게 느껴졌습니다. 가슴속에 얹혀있던 돌덩이를 내려놓은 듯 가볍습니다.',
    timestamp: '오늘 오전 07:42',
    lotusCount: 28,
  },
  {
    id: 'post-2',
    author: '연꽃향 도반',
    templeStayLocation: 'S 사회문화회관',
    emotionTag: '알아차림',
    content:
      '퇴근 후 저녁 명상 프로그램에 참여했습니다. 회사에서 상사와의 갈등 때문에 하루 종일 억울하고 씩씩대던 제 마음이, 코끝의 호흡에 집중하면서 가만히 수면 아래로 가라앉는 것을 보았습니다. 상대가 아니라 내 자존심이 상해서 괴로웠다는 것을 솔직히 인정하게 되었습니다.',
    timestamp: '어제 오후 21:15',
    lotusCount: 42,
  },
  {
    id: 'post-3',
    author: '죽림심인 도반',
    templeStayLocation: 'J 정사 대숲스테이',
    emotionTag: '평온',
    content:
      '새벽 5시 죽림정사 푸른 대나무 숲길을 도반들과 묵언으로 걸었습니다. 댓잎을 스치는 청아한 바람 소리와 촉촉한 흙냄새를 온몸으로 들이마시니 머리가 맑아집니다. 오늘 아침 공양에서 먹은 따뜻한 시래기 된장국 한 그릇이 그 어떤 성찬보다 감사했습니다.',
    timestamp: '2일 전',
    lotusCount: 35,
  },
  {
    id: 'post-4',
    author: '보리수 도반',
    templeStayLocation: 'M 수련원 주말수련',
    emotionTag: '참회',
    content:
      '새벽 108배를 드리며 눈물이 흘렀습니다. 늘 가족들에게 ‘너희를 위해서’라며 강요하고 잔소리했던 제 행동이 사실은 제 불안과 통제욕 때문이었음을 보았습니다. 이제는 가족을 바꾸려 하지 않고 있는 그대로 따뜻하게 안아주고 싶습니다.',
    timestamp: '3일 전',
    lotusCount: 51,
  },
];

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store, max-age=0',
};

function getMemoryStores(): {
  posts: Map<string, StoredMindPost>;
  cheers: Map<string, number>;
} {
  const g = globalThis as unknown as {
    __jungtoVercelMindPosts?: Map<string, StoredMindPost>;
    __jungtoVercelMindCheers?: Map<string, number>;
  };
  if (!g.__jungtoVercelMindPosts) {
    g.__jungtoVercelMindPosts = new Map<string, StoredMindPost>();
  }
  if (!g.__jungtoVercelMindCheers) {
    g.__jungtoVercelMindCheers = new Map<string, number>();
  }
  return {
    posts: g.__jungtoVercelMindPosts,
    cheers: g.__jungtoVercelMindCheers,
  };
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

async function redisPipeline(
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

function parsePostsHash(raw: unknown): Map<string, StoredMindPost> {
  const map = new Map<string, StoredMindPost>();
  if (Array.isArray(raw)) {
    for (let i = 0; i < raw.length - 1; i += 2) {
      const k = String(raw[i]);
      const v = raw[i + 1];
      if (typeof v === 'string') {
        try {
          const parsed = JSON.parse(v) as StoredMindPost;
          if (parsed && parsed.id && parsed.content) map.set(k, parsed);
        } catch {
          // ignore
        }
      }
    }
  } else if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v === 'string') {
        try {
          const parsed = JSON.parse(v) as StoredMindPost;
          if (parsed && parsed.id && parsed.content) map.set(k, parsed);
        } catch {
          // ignore
        }
      }
    }
  }
  return map;
}

function parseCheersHash(raw: unknown): Map<string, number> {
  const map = new Map<string, number>();
  if (Array.isArray(raw)) {
    for (let i = 0; i < raw.length - 1; i += 2) {
      const k = String(raw[i]);
      const n = Number(raw[i + 1]);
      if (Number.isFinite(n)) map.set(k, n);
    }
  } else if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      const n = Number(v);
      if (Number.isFinite(n)) map.set(k, n);
    }
  }
  return map;
}

function formatRelativeTime(createdAt: number, now: number): string {
  const diffSec = Math.max(0, Math.floor((now - createdAt) / 1000));
  if (diffSec < 60) return '방금 전';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  const d = new Date(createdAt);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

function sanitizeText(raw: unknown, maxLen: number): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[\r<>]/g, '').trim().slice(0, maxLen);
}

function sanitizeEmotion(raw: unknown): MindSharePostDTO['emotionTag'] {
  for (const tag of VALID_EMOTIONS) {
    if (raw === tag) return tag;
  }
  return '평온';
}

function buildMergedPosts(
  dynamicMap: Map<string, StoredMindPost>,
  cheersMap: Map<string, number>
): MindSharePostDTO[] {
  const now = Date.now();
  const dynamicList = Array.from(dynamicMap.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_DYNAMIC_POSTS)
    .map<MindSharePostDTO>((p) => ({
      id: p.id,
      author: p.author,
      templeStayLocation: p.templeStayLocation,
      emotionTag: p.emotionTag,
      content: p.content,
      timestamp: formatRelativeTime(p.createdAt, now),
      lotusCount: Math.max(0, (p.baseLotus || 1) + (cheersMap.get(p.id) ?? 0)),
      createdAt: p.createdAt,
    }));

  const seedsWithCheers = SEED_POSTS.map((s) => ({
    ...s,
    lotusCount: Math.max(0, s.lotusCount + (cheersMap.get(s.id) ?? 0)),
  }));

  return [...dynamicList, ...seedsWithCheers];
}

async function loadStores(): Promise<{
  posts: Map<string, StoredMindPost>;
  cheers: Map<string, number>;
}> {
  const redis = getRedisConfig();
  if (redis) {
    try {
      const [postsRes, cheersRes] = await redisPipeline(redis, [
        ['HGETALL', REDIS_POSTS_HASH],
        ['HGETALL', REDIS_CHEERS_HASH],
      ]);
      return {
        posts: parsePostsHash(postsRes?.result),
        cheers: parseCheersHash(cheersRes?.result),
      };
    } catch {
      // fall through to warm memory fallback
    }
  }
  return getMemoryStores();
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(): Promise<Response> {
  const { posts, cheers } = await loadStores();
  return Response.json(
    { posts: buildMergedPosts(posts, cheers) },
    { status: 200, headers: CORS_HEADERS }
  );
}

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const redis = getRedisConfig();
  const mem = getMemoryStores();

  if (body.type === 'cheer') {
    const postId = sanitizeText(body.postId, 80);
    if (!postId) {
      return Response.json({ error: 'POST_ID_REQUIRED' }, { status: 400, headers: CORS_HEADERS });
    }
    const delta = body.delta === -1 ? -1 : 1;

    if (redis) {
      try {
        const [, postsRes, cheersRes] = await redisPipeline(redis, [
          ['HINCRBY', REDIS_CHEERS_HASH, postId, delta],
          ['HGETALL', REDIS_POSTS_HASH],
          ['HGETALL', REDIS_CHEERS_HASH],
        ]);
        const postsMap = parsePostsHash(postsRes?.result);
        const cheersMap = parseCheersHash(cheersRes?.result);
        return Response.json(
          { posts: buildMergedPosts(postsMap, cheersMap) },
          { status: 200, headers: CORS_HEADERS }
        );
      } catch {
        // fallback below
      }
    }

    mem.cheers.set(postId, (mem.cheers.get(postId) ?? 0) + delta);
    return Response.json(
      { posts: buildMergedPosts(mem.posts, mem.cheers) },
      { status: 200, headers: CORS_HEADERS }
    );
  }

  const content = sanitizeText(body.content, 600);
  if (!content) {
    return Response.json({ error: 'CONTENT_REQUIRED' }, { status: 400, headers: CORS_HEADERS });
  }

  const rawAuthor = sanitizeText(body.author, 24);
  const author = rawAuthor
    ? rawAuthor.endsWith('도반')
      ? rawAuthor
      : `${rawAuthor} 도반`
    : '이름없는 도반';
  const templeStayLocation = sanitizeText(body.templeStayLocation, 40) || '온라인 3D 도량';
  const emotionTag = sanitizeEmotion(body.emotionTag);

  const createdAt = Date.now();
  const id = `post-${createdAt}-${Math.random().toString(36).slice(2, 7)}`;
  const newPost: StoredMindPost = {
    id,
    author,
    templeStayLocation,
    emotionTag,
    content,
    createdAt,
    baseLotus: 1,
  };

  if (redis) {
    try {
      const [, postsRes, cheersRes] = await redisPipeline(redis, [
        ['HSET', REDIS_POSTS_HASH, id, JSON.stringify(newPost)],
        ['HGETALL', REDIS_POSTS_HASH],
        ['HGETALL', REDIS_CHEERS_HASH],
      ]);
      const postsMap = parsePostsHash(postsRes?.result);
      const cheersMap = parseCheersHash(cheersRes?.result);

      if (postsMap.size > MAX_DYNAMIC_POSTS) {
        const sortedOldest = Array.from(postsMap.values())
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(MAX_DYNAMIC_POSTS)
          .map((p) => p.id);
        if (sortedOldest.length > 0) {
          void redisPipeline(redis, [['HDEL', REDIS_POSTS_HASH, ...sortedOldest]]).catch(() => {});
          for (const oldId of sortedOldest) postsMap.delete(oldId);
        }
      }

      return Response.json(
        {
          post: {
            id: newPost.id,
            author: newPost.author,
            templeStayLocation: newPost.templeStayLocation,
            emotionTag: newPost.emotionTag,
            content: newPost.content,
            timestamp: '방금 전',
            lotusCount: 1,
            createdAt: newPost.createdAt,
          },
          posts: buildMergedPosts(postsMap, cheersMap),
        },
        { status: 201, headers: CORS_HEADERS }
      );
    } catch {
      // fall through to warm memory fallback
    }
  }

  mem.posts.set(id, newPost);
  if (mem.posts.size > MAX_DYNAMIC_POSTS) {
    const oldest = Array.from(mem.posts.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(MAX_DYNAMIC_POSTS);
    for (const o of oldest) mem.posts.delete(o.id);
  }

  return Response.json(
    {
      post: {
        id: newPost.id,
        author: newPost.author,
        templeStayLocation: newPost.templeStayLocation,
        emotionTag: newPost.emotionTag,
        content: newPost.content,
        timestamp: '방금 전',
        lotusCount: 1,
        createdAt: newPost.createdAt,
      },
      posts: buildMergedPosts(mem.posts, mem.cheers),
    },
    { status: 201, headers: CORS_HEADERS }
  );
}
