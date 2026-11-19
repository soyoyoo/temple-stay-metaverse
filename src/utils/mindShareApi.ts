import { INITIAL_MIND_POSTS, MindSharePost } from '../data/programsData';

const LOCAL_POSTS_KEY = 'jungto_mind_posts';
const LOCAL_CHEERED_IDS_KEY = 'jungto_cheered_mind_ids';
const MIND_SHARE_CHANNEL = 'jungto_mind_share_channel';

function getApiBaseUrl(): string {
  try {
    const raw = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
      ?.VITE_API_BASE_URL;
    return typeof raw === 'string' ? raw.trim().replace(/\/+$/, '') : '';
  } catch {
    return '';
  }
}

function resolveMindSharesUrl(): string {
  const base = getApiBaseUrl();
  return base ? `${base}/api/mind-shares` : '/api/mind-shares';
}

export function getCheeredPostIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LOCAL_CHEERED_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

function saveCheeredPostIds(ids: Set<string>) {
  try {
    localStorage.setItem(LOCAL_CHEERED_IDS_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore storage quota errors
  }
}

export function loadLocalCachedMindPosts(): MindSharePost[] {
  const cheered = getCheeredPostIds();
  try {
    const saved = localStorage.getItem(LOCAL_POSTS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((p: MindSharePost) => ({
          ...p,
          hasUserCheered: cheered.has(p.id) || Boolean(p.hasUserCheered),
        }));
      }
    }
  } catch {
    // ignore
  }
  return INITIAL_MIND_POSTS.map((p) => ({
    ...p,
    hasUserCheered: cheered.has(p.id),
  }));
}

function applyCheeredStateAndCache(serverPosts: MindSharePost[]): MindSharePost[] {
  const cheered = getCheeredPostIds();
  const normalized = serverPosts.map((p) => ({
    ...p,
    hasUserCheered: cheered.has(p.id),
  }));
  try {
    localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(normalized));
  } catch {
    // ignore
  }
  return normalized;
}

export function broadcastMindShareUpdated() {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
  try {
    const bc = new BroadcastChannel(MIND_SHARE_CHANNEL);
    bc.postMessage({ type: 'mindshare:refresh' });
    bc.close();
  } catch {
    // ignore
  }
}

export function subscribeMindShareBroadcast(onUpdate: () => void): () => void {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return () => {};
  }
  try {
    const bc = new BroadcastChannel(MIND_SHARE_CHANNEL);
    bc.onmessage = (ev: MessageEvent) => {
      if (ev.data?.type === 'mindshare:refresh') {
        onUpdate();
      }
    };
    return () => {
      try {
        bc.close();
      } catch {
        // ignore
      }
    };
  } catch {
    return () => {};
  }
}

export async function fetchSharedMindPosts(): Promise<MindSharePost[]> {
  try {
    const res = await fetch(resolveMindSharesUrl(), {
      method: 'GET',
      cache: 'no-store',
    });
    if (!res.ok) {
      return loadLocalCachedMindPosts();
    }
    const data = (await res.json()) as { posts?: MindSharePost[] };
    if (Array.isArray(data.posts) && data.posts.length > 0) {
      return applyCheeredStateAndCache(data.posts);
    }
  } catch {
    // fallback to cached local list on network error
  }
  return loadLocalCachedMindPosts();
}

export async function submitSharedMindPost(input: {
  author: string;
  templeStayLocation: string;
  emotionTag: MindSharePost['emotionTag'];
  content: string;
}): Promise<MindSharePost[]> {
  const trimmedContent = input.content.trim();
  const rawAuthor = input.author.trim();
  const authorLabel = rawAuthor
    ? rawAuthor.endsWith('도반')
      ? rawAuthor
      : `${rawAuthor} 도반`
    : '이름없는 도반';

  try {
    const res = await fetch(resolveMindSharesUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'create',
        author: rawAuthor,
        templeStayLocation: input.templeStayLocation,
        emotionTag: input.emotionTag,
        content: trimmedContent,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { post?: MindSharePost; posts?: MindSharePost[] };
      if (data.post?.id) {
        const cheered = getCheeredPostIds();
        cheered.add(data.post.id);
        saveCheeredPostIds(cheered);
      }
      if (Array.isArray(data.posts)) {
        const result = applyCheeredStateAndCache(data.posts);
        broadcastMindShareUpdated();
        return result;
      }
    }
  } catch {
    // fall through to local save if offline
  }

  const localPost: MindSharePost = {
    id: `post-${Date.now()}`,
    author: authorLabel,
    templeStayLocation: input.templeStayLocation,
    emotionTag: input.emotionTag,
    content: trimmedContent,
    timestamp: '방금 전',
    lotusCount: 1,
    hasUserCheered: true,
  };
  const cheered = getCheeredPostIds();
  cheered.add(localPost.id);
  saveCheeredPostIds(cheered);

  const updated = [localPost, ...loadLocalCachedMindPosts()];
  try {
    localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
  broadcastMindShareUpdated();
  return updated;
}

export async function cheerSharedMindPost(
  postId: string,
  currentlyCheered: boolean
): Promise<MindSharePost[]> {
  const cheered = getCheeredPostIds();
  const nextCheered = !currentlyCheered;
  if (nextCheered) {
    cheered.add(postId);
  } else {
    cheered.delete(postId);
  }
  saveCheeredPostIds(cheered);

  try {
    const res = await fetch(resolveMindSharesUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'cheer',
        postId,
        delta: nextCheered ? 1 : -1,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { posts?: MindSharePost[] };
      if (Array.isArray(data.posts)) {
        const result = applyCheeredStateAndCache(data.posts);
        broadcastMindShareUpdated();
        return result;
      }
    }
  } catch {
    // fall through to optimistic local update
  }

  const updated = loadLocalCachedMindPosts().map((p) => {
    if (p.id === postId) {
      return {
        ...p,
        lotusCount: Math.max(0, p.lotusCount + (nextCheered ? 1 : -1)),
        hasUserCheered: nextCheered,
      };
    }
    return p;
  });
  try {
    localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
  broadcastMindShareUpdated();
  return updated;
}
