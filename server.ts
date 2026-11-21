import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI } from '@google/genai';
import { GET as handleGetMindShares, POST as handlePostMindShares } from './api/mind-shares.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MAX_CONCURRENT_USERS = 100;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
}

const TTS_MODEL = 'gemini-3.8-flash-lite-tts';
const TTS_VOICE = 'Charon';
const TTS_CACHE_DIR = path.resolve(__dirname, '.tts-cache');
const dharmaTtsCache = new Map<string, Buffer>();
const inFlightTts = new Map<string, Promise<Buffer>>();
const MAX_TTS_CACHE_ITEMS = 150;
let ttsQuotaBlockedUntil = 0;

function ensureTtsCacheDir() {
  try {
    fs.mkdirSync(TTS_CACHE_DIR, { recursive: true });
  } catch {
    // ignore filesystem errors cleanly
  }
}

function getTtsCacheKey(text: string): string {
  return crypto.createHash('sha256').update(`${TTS_MODEL}:${TTS_VOICE}:${text}`).digest('hex');
}

function readDiskTtsCache(key: string): Buffer | null {
  try {
    const filePath = path.join(TTS_CACHE_DIR, `${key}.wav`);
    if (fs.existsSync(filePath)) {
      const buf = fs.readFileSync(filePath);
      if (buf.length > 0) return buf;
    }
  } catch {
    // ignore
  }
  return null;
}

function writeDiskTtsCache(key: string, buf: Buffer) {
  try {
    ensureTtsCacheDir();
    const filePath = path.join(TTS_CACHE_DIR, `${key}.wav`);
    fs.writeFileSync(filePath, buf);
  } catch {
    // ignore
  }
}

function isQuotaExceededError(err: unknown): boolean {
  const anyErr = err as { status?: number; code?: number; message?: string };
  if (anyErr?.status === 429 || anyErr?.code === 429) return true;
  const msg = typeof anyErr?.message === 'string' ? anyErr.message : String(err ?? '');
  return msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.toLowerCase().includes('quota');
}

function parseRetryAfterSec(err: unknown): number {
  const anyErr = err as { message?: string };
  const msg = typeof anyErr?.message === 'string' ? anyErr.message : String(err ?? '');

  const retryDelayMatch = msg.match(/retryDelay["']?\s*[:=]\s*["']?(\d+(?:\.\d+)?)s/i);
  if (retryDelayMatch) {
    const parsed = Math.ceil(Number(retryDelayMatch[1]));
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.max(60, Math.min(43200, parsed));
    }
  }

  const hmsMatch = msg.match(/retry in\s+(?:(\d+)h)?(?:(\d+)m)?(\d+(?:\.\d+)?)s/i);
  if (hmsMatch) {
    const h = Number(hmsMatch[1] || 0);
    const m = Number(hmsMatch[2] || 0);
    const s = Math.ceil(Number(hmsMatch[3] || 0));
    const total = h * 3600 + m * 60 + s;
    if (Number.isFinite(total) && total > 0) {
      return Math.max(60, Math.min(43200, total));
    }
  }

  return 3600;
}

type TempleId = 'seocho' | 'mungyeong' | 'jukrim';

interface PlayerState {
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
  joined: boolean;
}

interface HttpPlayerEntry extends PlayerState {
  lastSeen: number;
}

export interface PlayerSummary {
  id: string;
  nickname: string;
  templeId: TempleId;
  x: number;
  y: number;
  z: number;
  action: string;
}

const ROBE_PALETTE = [
  0x787d82,
  0x8c8273,
  0x6b776e,
  0x707b84,
  0x877a6e,
  0x5f6b69,
  0x847e78,
];

function sanitizeNickname(raw: unknown): string {
  if (typeof raw !== 'string') return '수행자';
  const cleaned = raw.replace(/[\r\n\t<>]/g, '').trim().slice(0, 12);
  return cleaned || '수행자';
}

function sanitizeClientKey(raw: unknown, fallbackId: string): string {
  if (typeof raw !== 'string') return fallbackId;
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48);
  return cleaned || fallbackId;
}

function sanitizeTempleId(raw: unknown): TempleId {
  if (raw === 'seocho' || raw === 'mungyeong' || raw === 'jukrim') return raw;
  return 'mungyeong';
}

function clampCoord(val: unknown, fallback = 0): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return fallback;
  return Math.max(-150, Math.min(150, val));
}

const REDIS_PLAYERS_HASH_KEY = 'jungto:metaverse:players:v1';
const REDIS_PLAYER_TTL_MS = 20000;

function getMultiplayerRedisConfig(): { url: string; token: string } | null {
  const url = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '')
    .trim()
    .replace(/\/+$/, '');
  const token = (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
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

function parseRedisPlayers(raw: unknown): Map<string, HttpPlayerEntry> {
  const map = new Map<string, HttpPlayerEntry>();
  if (Array.isArray(raw)) {
    for (let i = 0; i < raw.length - 1; i += 2) {
      const k = String(raw[i]);
      const v = raw[i + 1];
      if (typeof v === 'string') {
        try {
          const parsed = JSON.parse(v) as HttpPlayerEntry;
          if (parsed && parsed.clientKey) {
            parsed.joined = true;
            map.set(k, parsed);
          }
        } catch {
          // ignore malformed entry
        }
      }
    }
  } else if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v === 'string') {
        try {
          const parsed = JSON.parse(v) as HttpPlayerEntry;
          if (parsed && parsed.clientKey) {
            parsed.joined = true;
            map.set(k, parsed);
          }
        } catch {
          // ignore
        }
      }
    }
  }
  return map;
}

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use('/api', (_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (_req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  const clients = new Map<WebSocket, PlayerState>();
  const wsAlive = new WeakMap<WebSocket, boolean>();
  const httpPlayers = new Map<string, HttpPlayerEntry>();
  const redisExternalPlayers = new Map<string, HttpPlayerEntry>();
  const redisDirtyKeys = new Set<string>();
  const wsLastRedisKeepalive = new Map<string, number>();
  let lastRedisSyncAt = 0;
  let redisSyncInFlight: Promise<void> | null = null;
  let nextSeq = 1;

  function sendJson(ws: WebSocket, payload: unknown) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  function toPublicPlayer(p: PlayerState) {
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

  function hasLocalClientKey(clientKey: string): boolean {
    for (const wsState of clients.values()) {
      if (wsState.joined && wsState.clientKey === clientKey) return true;
    }
    return httpPlayers.has(clientKey);
  }

  function pushPlayerToRedis(p: PlayerState) {
    const redis = getMultiplayerRedisConfig();
    if (!redis || !p.joined) return;
    const now = Date.now();
    wsLastRedisKeepalive.set(p.clientKey, now);
    redisDirtyKeys.delete(p.clientKey);
    const payload: HttpPlayerEntry = { ...toPublicPlayer(p), joined: true, lastSeen: now };
    void redisPipeline(redis, [
      ['HSET', REDIS_PLAYERS_HASH_KEY, p.clientKey, JSON.stringify(payload)],
      ['EXPIRE', REDIS_PLAYERS_HASH_KEY, 300],
    ]).catch(() => {
      // ignore transient Redis network error
    });
  }

  function removePlayerFromRedis(clientKey: string) {
    redisDirtyKeys.delete(clientKey);
    wsLastRedisKeepalive.delete(clientKey);
    if (hasLocalClientKey(clientKey)) return;
    const redis = getMultiplayerRedisConfig();
    if (!redis) return;
    void redisPipeline(redis, [['HDEL', REDIS_PLAYERS_HASH_KEY, clientKey]]).catch(() => {
      // ignore
    });
  }

  function getActivePlayers(): PlayerState[] {
    const byId = new Map<string, PlayerState>();
    for (const state of clients.values()) {
      if (state.joined) {
        byId.set(state.id, state);
      }
    }
    const now = Date.now();
    for (const [key, entry] of httpPlayers.entries()) {
      if (now - entry.lastSeen > REDIS_PLAYER_TTL_MS) {
        httpPlayers.delete(key);
        continue;
      }
      let hasWs = false;
      for (const wsState of clients.values()) {
        if (wsState.joined && wsState.clientKey === entry.clientKey) {
          hasWs = true;
          break;
        }
      }
      if (!hasWs) {
        byId.set(entry.id, entry);
      }
    }
    for (const [key, entry] of redisExternalPlayers.entries()) {
      if (now - entry.lastSeen > REDIS_PLAYER_TTL_MS) {
        redisExternalPlayers.delete(key);
        continue;
      }
      if (!hasLocalClientKey(key)) {
        byId.set(entry.id, entry);
      }
    }
    return Array.from(byId.values());
  }

  function getAllPlayersSummary(): PlayerSummary[] {
    return getActivePlayers().map((p) => ({
      id: p.id,
      nickname: p.nickname,
      templeId: p.templeId,
      x: p.x,
      y: p.y,
      z: p.z,
      action: p.action,
    }));
  }

  function broadcastToTemple(templeId: TempleId, payload: unknown, excludeWs?: WebSocket) {
    const encoded = JSON.stringify(payload);
    for (const [ws, state] of clients.entries()) {
      if (ws !== excludeWs && state.joined && state.templeId === templeId && ws.readyState === WebSocket.OPEN) {
        ws.send(encoded);
      }
    }
  }

  function broadcastPresenceCount() {
    const countsByTemple: Record<TempleId, number> = {
      mungyeong: 0,
      seocho: 0,
      jukrim: 0,
    };
    const active = getActivePlayers();
    for (const state of active) {
      countsByTemple[state.templeId] += 1;
    }
    const encoded = JSON.stringify({
      type: 'presence:count',
      totalOnline: active.length,
      maxUsers: MAX_CONCURRENT_USERS,
      countsByTemple,
      allPlayersSummary: active.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        templeId: p.templeId,
        x: p.x,
        y: p.y,
        z: p.z,
        action: p.action,
      })),
    });
    for (const [ws, state] of clients.entries()) {
      if (state.joined && ws.readyState === WebSocket.OPEN) {
        ws.send(encoded);
      }
    }
  }

  function getPlayersInTemple(templeId: TempleId, excludeId?: string) {
    return getActivePlayers()
      .filter((state) => state.templeId === templeId && state.id !== excludeId)
      .map(toPublicPlayer);
  }

  async function syncFromRedis(force = false) {
    const redis = getMultiplayerRedisConfig();
    if (!redis) return;
    const now = Date.now();
    if (!force && now - lastRedisSyncAt < 750) return;
    if (redisSyncInFlight) {
      await redisSyncInFlight;
      return;
    }

    redisSyncInFlight = (async () => {
      try {
        const cmds: unknown[][] = [];
        for (const wsState of clients.values()) {
          if (!wsState.joined) continue;
          const lastPush = wsLastRedisKeepalive.get(wsState.clientKey) ?? 0;
          if (redisDirtyKeys.has(wsState.clientKey) || now - lastPush > 6000) {
            redisDirtyKeys.delete(wsState.clientKey);
            wsLastRedisKeepalive.set(wsState.clientKey, now);
            const payload: HttpPlayerEntry = { ...toPublicPlayer(wsState), joined: true, lastSeen: now };
            cmds.push(['HSET', REDIS_PLAYERS_HASH_KEY, wsState.clientKey, JSON.stringify(payload)]);
          }
        }
        if (cmds.length > 0) {
          cmds.push(['EXPIRE', REDIS_PLAYERS_HASH_KEY, 300]);
        }
        cmds.push(['HGETALL', REDIS_PLAYERS_HASH_KEY]);

        const results = await redisPipeline(redis, cmds);
        lastRedisSyncAt = Date.now();
        const hgetRes = results[results.length - 1];
        const freshAll = parseRedisPlayers(hgetRes?.result);

        const expiredKeys: string[] = [];
        const nextExternal = new Map<string, HttpPlayerEntry>();
        const evalNow = Date.now();

        for (const [key, entry] of freshAll.entries()) {
          if (!entry.lastSeen || evalNow - entry.lastSeen > REDIS_PLAYER_TTL_MS) {
            expiredKeys.push(key);
            continue;
          }
          if (!hasLocalClientKey(key)) {
            nextExternal.set(key, entry);
          }
        }

        if (expiredKeys.length > 0) {
          void redisPipeline(redis, [['HDEL', REDIS_PLAYERS_HASH_KEY, ...expiredKeys]]).catch(() => {});
        }

        let presenceChanged = false;

        // Detect removed external players
        for (const [key, prev] of redisExternalPlayers.entries()) {
          if (!nextExternal.has(key)) {
            redisExternalPlayers.delete(key);
            broadcastToTemple(prev.templeId, { type: 'player:left', id: prev.id });
            presenceChanged = true;
          }
        }

        // Detect added or updated external players
        for (const [key, entry] of nextExternal.entries()) {
          const prev = redisExternalPlayers.get(key);
          redisExternalPlayers.set(key, entry);

          if (!prev) {
            broadcastToTemple(entry.templeId, { type: 'player:joined', player: toPublicPlayer(entry) });
            presenceChanged = true;
          } else if (prev.templeId !== entry.templeId) {
            broadcastToTemple(prev.templeId, { type: 'player:left', id: prev.id });
            broadcastToTemple(entry.templeId, { type: 'player:joined', player: toPublicPlayer(entry) });
            presenceChanged = true;
          } else {
            if (prev.nickname !== entry.nickname) {
              broadcastToTemple(entry.templeId, {
                type: 'player:renamed',
                id: entry.id,
                nickname: entry.nickname,
              });
              presenceChanged = true;
            }
            if (
              prev.x !== entry.x ||
              prev.y !== entry.y ||
              prev.z !== entry.z ||
              prev.rotY !== entry.rotY ||
              prev.action !== entry.action ||
              prev.isMoving !== entry.isMoving
            ) {
              broadcastToTemple(entry.templeId, {
                type: 'player:updated',
                id: entry.id,
                x: entry.x,
                y: entry.y,
                z: entry.z,
                rotY: entry.rotY,
                action: entry.action,
                isMoving: entry.isMoving,
              });
            }
          }
        }

        if (presenceChanged) {
          broadcastPresenceCount();
        }
      } catch {
        // ignore transient Redis network errors
      } finally {
        redisSyncInFlight = null;
      }
    })();

    await redisSyncInFlight;
  }

  // Background cross-instance Redis sync for AI Studio Preview <-> Shared App URL <-> Vercel
  const redisSyncInterval = setInterval(() => {
    if (!getMultiplayerRedisConfig()) return;
    if (clients.size === 0 && redisExternalPlayers.size === 0) return;
    void syncFromRedis(false);
  }, 900);

  // Heartbeat keepalive (prevents Cloud Run / reverse proxies from silently dropping idle WS)
  const heartbeatInterval = setInterval(() => {
    const now = Date.now();
    let changed = false;

    for (const [ws, state] of clients.entries()) {
      if (wsAlive.get(ws) === false) {
        clients.delete(ws);
        if (state.joined) {
          broadcastToTemple(state.templeId, { type: 'player:left', id: state.id });
          removePlayerFromRedis(state.clientKey);
          changed = true;
        }
        try {
          ws.terminate();
        } catch {
          // ignore
        }
        continue;
      }
      wsAlive.set(ws, false);
      try {
        ws.ping();
      } catch {
        // ignore
      }
    }

    for (const [key, entry] of httpPlayers.entries()) {
      if (now - entry.lastSeen > REDIS_PLAYER_TTL_MS) {
        httpPlayers.delete(key);
        broadcastToTemple(entry.templeId, { type: 'player:left', id: entry.id });
        removePlayerFromRedis(key);
        changed = true;
      }
    }

    if (changed) {
      broadcastPresenceCount();
    }
  }, 15000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
    clearInterval(redisSyncInterval);
  });

  wss.on('connection', (ws: WebSocket) => {
    const activeCount = getActivePlayers().length;
    if (activeCount >= MAX_CONCURRENT_USERS) {
      sendJson(ws, {
        type: 'room:full',
        maxUsers: MAX_CONCURRENT_USERS,
        message: `현재 동시 접속 인원(${MAX_CONCURRENT_USERS}명)이 가득 찼습니다. 잠시 후 다시 접속해 주세요.`,
      });
      ws.close(1008, 'Max capacity reached');
      return;
    }

    const playerId = `p-${Date.now().toString(36)}-${nextSeq++}`;
    const robeColor = ROBE_PALETTE[nextSeq % ROBE_PALETTE.length];

    const initialState: PlayerState = {
      id: playerId,
      clientKey: playerId,
      nickname: '수행자',
      templeId: 'mungyeong',
      x: 0,
      y: 0,
      z: 18,
      rotY: 0,
      action: 'idle',
      isMoving: false,
      robeColor,
      joined: false,
    };

    clients.set(ws, initialState);
    wsAlive.set(ws, true);

    ws.on('pong', () => {
      wsAlive.set(ws, true);
    });

    ws.on('message', (rawData) => {
      wsAlive.set(ws, true);
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(rawData.toString());
      } catch {
        return;
      }

      const current = clients.get(ws);
      if (!current) return;

      if (msg.type === 'ping') {
        if (current.joined) {
          const lastPush = wsLastRedisKeepalive.get(current.clientKey) ?? 0;
          if (Date.now() - lastPush > 5000) {
            pushPlayerToRedis(current);
          }
        }
        sendJson(ws, { type: 'pong' });
        return;
      }

      if (msg.type === 'join') {
        const prevTemple = current.templeId;
        const wasJoined = current.joined;
        current.clientKey = sanitizeClientKey(msg.clientKey, current.id);
        current.nickname = sanitizeNickname(msg.nickname);
        current.templeId = sanitizeTempleId(msg.templeId);
        current.x = clampCoord(msg.x, 0);
        current.y = clampCoord(msg.y, 0);
        current.z = clampCoord(msg.z, 18);
        current.rotY = typeof msg.rotY === 'number' && Number.isFinite(msg.rotY) ? msg.rotY : 0;
        current.action = typeof msg.action === 'string' ? msg.action.slice(0, 20) : 'idle';
        current.isMoving = Boolean(msg.isMoving);
        current.joined = true;

        // Remove any HTTP fallback / external cache record for this same client tab
        const existingHttp = httpPlayers.get(current.clientKey);
        if (existingHttp) {
          httpPlayers.delete(current.clientKey);
          if (existingHttp.id !== current.id) {
            broadcastToTemple(existingHttp.templeId, { type: 'player:left', id: existingHttp.id }, ws);
          }
        }
        const existingExternal = redisExternalPlayers.get(current.clientKey);
        if (existingExternal) {
          redisExternalPlayers.delete(current.clientKey);
          if (existingExternal.id !== current.id) {
            broadcastToTemple(existingExternal.templeId, { type: 'player:left', id: existingExternal.id }, ws);
          }
        }

        // Also close stale duplicate WS with the exact same clientKey if browser reconnected quickly
        for (const [otherWs, otherState] of clients.entries()) {
          if (otherWs !== ws && otherState.joined && otherState.clientKey === current.clientKey) {
            clients.delete(otherWs);
            broadcastToTemple(otherState.templeId, { type: 'player:left', id: otherState.id }, ws);
            try {
              otherWs.close(1000, 'Replaced by newer connection');
            } catch {
              // ignore
            }
          }
        }

        if (wasJoined && prevTemple !== current.templeId) {
          broadcastToTemple(prevTemple, { type: 'player:left', id: current.id }, ws);
        }

        pushPlayerToRedis(current);
        void syncFromRedis(true).then(() => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const active = getActivePlayers();
          sendJson(ws, {
            type: 'init',
            selfId: current.id,
            maxUsers: MAX_CONCURRENT_USERS,
            totalOnline: active.length,
            players: getPlayersInTemple(current.templeId, current.id),
            allPlayersSummary: getAllPlayersSummary(),
          });
          broadcastPresenceCount();
        });

        broadcastToTemple(current.templeId, { type: 'player:joined', player: toPublicPlayer(current) }, ws);
        broadcastPresenceCount();
      } else if (msg.type === 'sync:request') {
        if (!current.joined) return;
        void syncFromRedis(false).then(() => {
          if (ws.readyState !== WebSocket.OPEN) return;
          sendJson(ws, {
            type: 'room:sync',
            selfId: current.id,
            templeId: current.templeId,
            players: getPlayersInTemple(current.templeId, current.id),
            allPlayersSummary: getAllPlayersSummary(),
          });
        });
      } else if (msg.type === 'state') {
        if (!current.joined) return;
        const nextTemple = sanitizeTempleId(msg.templeId ?? current.templeId);
        const templeChanged = nextTemple !== current.templeId;
        const oldTemple = current.templeId;
        const oldAction = current.action;

        current.templeId = nextTemple;
        current.x = clampCoord(msg.x, current.x);
        current.y = clampCoord(msg.y, current.y);
        current.z = clampCoord(msg.z, current.z);
        current.rotY = typeof msg.rotY === 'number' && Number.isFinite(msg.rotY) ? msg.rotY : current.rotY;
        current.action = typeof msg.action === 'string' ? msg.action.slice(0, 20) : current.action;
        current.isMoving = Boolean(msg.isMoving);

        const lastRedisPush = wsLastRedisKeepalive.get(current.clientKey) ?? 0;
        if (templeChanged || oldAction !== current.action || Date.now() - lastRedisPush >= 350) {
          pushPlayerToRedis(current);
        } else {
          redisDirtyKeys.add(current.clientKey);
        }

        if (templeChanged) {
          broadcastToTemple(oldTemple, { type: 'player:left', id: current.id }, ws);
          sendJson(ws, {
            type: 'room:sync',
            selfId: current.id,
            templeId: current.templeId,
            players: getPlayersInTemple(current.templeId, current.id),
            allPlayersSummary: getAllPlayersSummary(),
          });
          broadcastToTemple(current.templeId, { type: 'player:joined', player: toPublicPlayer(current) }, ws);
          broadcastPresenceCount();
        } else {
          broadcastToTemple(
            current.templeId,
            {
              type: 'player:updated',
              id: current.id,
              x: current.x,
              y: current.y,
              z: current.z,
              rotY: current.rotY,
              action: current.action,
              isMoving: current.isMoving,
            },
            ws
          );
        }
      } else if (msg.type === 'nickname') {
        current.nickname = sanitizeNickname(msg.nickname);
        if (current.joined) {
          pushPlayerToRedis(current);
          broadcastToTemple(
            current.templeId,
            {
              type: 'player:renamed',
              id: current.id,
              nickname: current.nickname,
            },
            ws
          );
          broadcastPresenceCount();
        }
      }
    });

    ws.on('close', () => {
      const left = clients.get(ws);
      clients.delete(ws);
      if (left && left.joined) {
        broadcastToTemple(left.templeId, { type: 'player:left', id: left.id });
        removePlayerFromRedis(left.clientKey);
        broadcastPresenceCount();
      }
    });

    ws.on('error', () => {
      const left = clients.get(ws);
      clients.delete(ws);
      if (left && left.joined) {
        broadcastToTemple(left.templeId, { type: 'player:left', id: left.id });
        removePlayerFromRedis(left.clientKey);
        broadcastPresenceCount();
      }
    });
  });

  // HTTP fallback sync endpoint (merges WS, HTTP & Upstash Redis cross-instance players)
  app.post('/api/multiplayer/sync', async (req, res) => {
    const body = req.body ?? {};
    const clientKey = sanitizeClientKey(body.clientKey, '');
    if (!clientKey) {
      res.status(400).json({ error: 'CLIENT_KEY_REQUIRED' });
      return;
    }

    await syncFromRedis(false);

    // Check if this client already has a joined WebSocket
    let wsMatched: PlayerState | undefined;
    for (const wsState of clients.values()) {
      if (wsState.joined && wsState.clientKey === clientKey) {
        wsMatched = wsState;
        break;
      }
    }

    const templeId = sanitizeTempleId(body.templeId);
    if (wsMatched) {
      res.json({
        selfId: wsMatched.id,
        totalOnline: getActivePlayers().length,
        maxUsers: MAX_CONCURRENT_USERS,
        players: getPlayersInTemple(wsMatched.templeId, wsMatched.id),
        allPlayersSummary: getAllPlayersSummary(),
      });
      return;
    }

    const existing = httpPlayers.get(clientKey);
    if (!existing && getActivePlayers().length >= MAX_CONCURRENT_USERS) {
      res.status(429).json({
        error: 'ROOM_FULL',
        maxUsers: MAX_CONCURRENT_USERS,
        message: `현재 동시 접속 인원(${MAX_CONCURRENT_USERS}명)이 가득 찼습니다.`,
      });
      return;
    }

    const prevTemple = existing?.templeId;
    const prevNickname = existing?.nickname;
    const id = existing?.id || `p-http-${Date.now().toString(36)}-${nextSeq++}`;
    const robeColor = existing?.robeColor || ROBE_PALETTE[nextSeq % ROBE_PALETTE.length];

    const entry: HttpPlayerEntry = {
      id,
      clientKey,
      nickname: sanitizeNickname(body.nickname),
      templeId,
      x: clampCoord(body.x, 0),
      y: clampCoord(body.y, 0),
      z: clampCoord(body.z, 18),
      rotY: typeof body.rotY === 'number' && Number.isFinite(body.rotY) ? body.rotY : 0,
      action: typeof body.action === 'string' ? body.action.slice(0, 20) : 'idle',
      isMoving: Boolean(body.isMoving),
      robeColor,
      joined: true,
      lastSeen: Date.now(),
    };
    httpPlayers.set(clientKey, entry);
    redisExternalPlayers.delete(clientKey);
    pushPlayerToRedis(entry);

    if (!existing) {
      broadcastToTemple(entry.templeId, { type: 'player:joined', player: toPublicPlayer(entry) });
      broadcastPresenceCount();
    } else if (prevTemple !== entry.templeId) {
      if (prevTemple) {
        broadcastToTemple(prevTemple, { type: 'player:left', id: entry.id });
      }
      broadcastToTemple(entry.templeId, { type: 'player:joined', player: toPublicPlayer(entry) });
      broadcastPresenceCount();
    } else {
      if (prevNickname !== entry.nickname) {
        broadcastToTemple(entry.templeId, {
          type: 'player:renamed',
          id: entry.id,
          nickname: entry.nickname,
        });
        broadcastPresenceCount();
      }
      broadcastToTemple(entry.templeId, {
        type: 'player:updated',
        id: entry.id,
        x: entry.x,
        y: entry.y,
        z: entry.z,
        rotY: entry.rotY,
        action: entry.action,
        isMoving: entry.isMoving,
      });
    }

    res.json({
      selfId: entry.id,
      totalOnline: getActivePlayers().length,
      maxUsers: MAX_CONCURRENT_USERS,
      players: getPlayersInTemple(entry.templeId, entry.id),
      allPlayersSummary: getAllPlayersSummary(),
    });
  });

  app.get('/api/presence', async (_req, res) => {
    await syncFromRedis(false);
    res.json({
      onlineCount: getActivePlayers().length,
      maxUsers: MAX_CONCURRENT_USERS,
    });
  });

  app.get('/api/mind-shares', async (_req, res) => {
    try {
      const apiRes = await handleGetMindShares();
      const body = await apiRes.text();
      res.status(apiRes.status).type('application/json').send(body);
    } catch {
      res.status(500).json({ error: 'MIND_SHARES_LOAD_FAILED' });
    }
  });

  app.post('/api/mind-shares', async (req, res) => {
    try {
      const apiRes = await handlePostMindShares(
        new Request('http://localhost/api/mind-shares', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req.body ?? {}),
        })
      );
      const body = await apiRes.text();
      res.status(apiRes.status).type('application/json').send(body);
    } catch {
      res.status(500).json({ error: 'MIND_SHARES_SAVE_FAILED' });
    }
  });

  ensureTtsCacheDir();

  app.post('/api/dharma-tts', async (req, res) => {
    const rawText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!rawText) {
      res.status(400).json({ error: 'TEXT_REQUIRED' });
      return;
    }
    const text = rawText.slice(0, 2500);
    const cacheKey = getTtsCacheKey(text);

    const memCached = dharmaTtsCache.get(cacheKey);
    if (memCached) {
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(memCached);
      return;
    }

    const diskCached = readDiskTtsCache(cacheKey);
    if (diskCached) {
      if (dharmaTtsCache.size >= MAX_TTS_CACHE_ITEMS) {
        const oldestKey = dharmaTtsCache.keys().next().value;
        if (oldestKey) dharmaTtsCache.delete(oldestKey);
      }
      dharmaTtsCache.set(cacheKey, diskCached);
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(diskCached);
      return;
    }

    const now = Date.now();
    if (now < ttsQuotaBlockedUntil) {
      const retryAfterSec = Math.max(1, Math.ceil((ttsQuotaBlockedUntil - now) / 1000));
      res.status(429).json({ error: 'QUOTA_EXCEEDED', retryAfterSec, fallback: true });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({ error: 'GEMINI_API_KEY_NOT_CONFIGURED', fallback: true });
      return;
    }

    let generationPromise = inFlightTts.get(cacheKey);
    if (!generationPromise) {
      generationPromise = (async () => {
        const response = await ai.models.generateContent({
          model: TTS_MODEL,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text,
                  speechMetadata: {
                    style:
                      'Warm, grounded, wise middle-aged Korean Buddhist male monk giving a calm conversational Dharma lecture in Korean with gentle cadence, compassionate warmth, and clear natural pauses',
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: TTS_VOICE },
              },
            },
          },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
          throw new Error('EMPTY_TTS_AUDIO');
        }

        const wavBuffer = Buffer.from(base64Audio, 'base64');
        if (dharmaTtsCache.size >= MAX_TTS_CACHE_ITEMS) {
          const oldestKey = dharmaTtsCache.keys().next().value;
          if (oldestKey) dharmaTtsCache.delete(oldestKey);
        }
        dharmaTtsCache.set(cacheKey, wavBuffer);
        writeDiskTtsCache(cacheKey, wavBuffer);
        return wavBuffer;
      })().finally(() => {
        inFlightTts.delete(cacheKey);
      });

      inFlightTts.set(cacheKey, generationPromise);
    }

    try {
      const wavBuffer = await generationPromise;
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(wavBuffer);
    } catch (err) {
      if (isQuotaExceededError(err)) {
        const retryAfterSec = parseRetryAfterSec(err);
        ttsQuotaBlockedUntil = Date.now() + retryAfterSec * 1000;
        console.warn(`[Dharma TTS] Gemini free-tier quota reached (429). Fallback active for ${retryAfterSec}s.`);
        res.status(429).json({ error: 'QUOTA_EXCEEDED', retryAfterSec, fallback: true });
        return;
      }

      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Dharma TTS] Generation unavailable (${msg}); client using fallback.`);
      res.status(502).json({ error: 'TTS_GENERATION_FAILED', fallback: true });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Metaverse server listening on http://0.0.0.0:${PORT} (max ${MAX_CONCURRENT_USERS} concurrent users)`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
