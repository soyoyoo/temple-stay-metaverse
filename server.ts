import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI } from '@google/genai';

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
  nickname: string;
  templeId: TempleId;
  x: number;
  y: number;
  z: number;
  rotY: number;
  action: string;
  isMoving: boolean;
  robeColor: number;
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

function sanitizeTempleId(raw: unknown): TempleId {
  if (raw === 'seocho' || raw === 'mungyeong' || raw === 'jukrim') return raw;
  return 'mungyeong';
}

function clampCoord(val: unknown, fallback = 0): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return fallback;
  return Math.max(-130, Math.min(130, val));
}

async function startServer() {
  const app = express();
  app.use(express.json());

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  const clients = new Map<WebSocket, PlayerState>();
  let nextSeq = 1;

  function sendJson(ws: WebSocket, payload: unknown) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  function broadcastToTemple(templeId: TempleId, payload: unknown, excludeWs?: WebSocket) {
    const encoded = JSON.stringify(payload);
    for (const [ws, state] of clients.entries()) {
      if (ws !== excludeWs && state.templeId === templeId && ws.readyState === WebSocket.OPEN) {
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
    for (const state of clients.values()) {
      countsByTemple[state.templeId] += 1;
    }
    const encoded = JSON.stringify({
      type: 'presence:count',
      totalOnline: clients.size,
      maxUsers: MAX_CONCURRENT_USERS,
      countsByTemple,
    });
    for (const ws of clients.keys()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(encoded);
      }
    }
  }

  function getPlayersInTemple(templeId: TempleId, excludeId?: string): PlayerState[] {
    const list: PlayerState[] = [];
    for (const state of clients.values()) {
      if (state.templeId === templeId && state.id !== excludeId) {
        list.push(state);
      }
    }
    return list;
  }

  wss.on('connection', (ws: WebSocket) => {
    // Enforce 100 concurrent user limit
    if (clients.size >= MAX_CONCURRENT_USERS) {
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
      nickname: '수행자',
      templeId: 'mungyeong',
      x: 0,
      y: 0,
      z: 18,
      rotY: 0,
      action: 'idle',
      isMoving: false,
      robeColor,
    };

    clients.set(ws, initialState);

    ws.on('message', (rawData) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(rawData.toString());
      } catch {
        return;
      }

      const current = clients.get(ws);
      if (!current) return;

      if (msg.type === 'join') {
        const prevTemple = current.templeId;
        current.nickname = sanitizeNickname(msg.nickname);
        current.templeId = sanitizeTempleId(msg.templeId);
        current.x = clampCoord(msg.x, 0);
        current.y = clampCoord(msg.y, 0);
        current.z = clampCoord(msg.z, 18);
        current.rotY = typeof msg.rotY === 'number' && Number.isFinite(msg.rotY) ? msg.rotY : 0;
        current.action = typeof msg.action === 'string' ? msg.action.slice(0, 20) : 'idle';
        current.isMoving = Boolean(msg.isMoving);

        if (prevTemple !== current.templeId) {
          broadcastToTemple(prevTemple, { type: 'player:left', id: current.id }, ws);
        }

        sendJson(ws, {
          type: 'init',
          selfId: current.id,
          maxUsers: MAX_CONCURRENT_USERS,
          totalOnline: clients.size,
          players: getPlayersInTemple(current.templeId, current.id),
        });

        broadcastToTemple(current.templeId, { type: 'player:joined', player: current }, ws);
        broadcastPresenceCount();
      } else if (msg.type === 'state') {
        const nextTemple = sanitizeTempleId(msg.templeId ?? current.templeId);
        const templeChanged = nextTemple !== current.templeId;
        const oldTemple = current.templeId;

        current.templeId = nextTemple;
        current.x = clampCoord(msg.x, current.x);
        current.y = clampCoord(msg.y, current.y);
        current.z = clampCoord(msg.z, current.z);
        current.rotY = typeof msg.rotY === 'number' && Number.isFinite(msg.rotY) ? msg.rotY : current.rotY;
        current.action = typeof msg.action === 'string' ? msg.action.slice(0, 20) : current.action;
        current.isMoving = Boolean(msg.isMoving);

        if (templeChanged) {
          broadcastToTemple(oldTemple, { type: 'player:left', id: current.id }, ws);
          sendJson(ws, {
            type: 'room:sync',
            templeId: current.templeId,
            players: getPlayersInTemple(current.templeId, current.id),
          });
          broadcastToTemple(current.templeId, { type: 'player:joined', player: current }, ws);
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
        broadcastToTemple(
          current.templeId,
          {
            type: 'player:renamed',
            id: current.id,
            nickname: current.nickname,
          },
          ws
        );
      }
    });

    ws.on('close', () => {
      const left = clients.get(ws);
      clients.delete(ws);
      if (left) {
        broadcastToTemple(left.templeId, { type: 'player:left', id: left.id });
        broadcastPresenceCount();
      }
    });

    ws.on('error', () => {
      const left = clients.get(ws);
      clients.delete(ws);
      if (left) {
        broadcastToTemple(left.templeId, { type: 'player:left', id: left.id });
        broadcastPresenceCount();
      }
    });
  });

  app.get('/api/presence', (_req, res) => {
    res.json({
      onlineCount: clients.size,
      maxUsers: MAX_CONCURRENT_USERS,
    });
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
