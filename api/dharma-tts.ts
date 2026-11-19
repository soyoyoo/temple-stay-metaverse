import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';

export const config = {
  runtime: 'nodejs',
};

const TTS_MODEL = 'gemini-3.8-flash-lite-tts';
const TTS_VOICE = 'Charon';
const MAX_TTS_CACHE_ITEMS = 60;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function getCacheState(): {
  cache: Map<string, Uint8Array>;
  blockedUntil: number;
} {
  const g = globalThis as unknown as {
    __jungtoVercelTtsCache?: Map<string, Uint8Array>;
    __jungtoVercelTtsBlockedUntil?: number;
  };
  if (!g.__jungtoVercelTtsCache) {
    g.__jungtoVercelTtsCache = new Map<string, Uint8Array>();
  }
  if (typeof g.__jungtoVercelTtsBlockedUntil !== 'number') {
    g.__jungtoVercelTtsBlockedUntil = 0;
  }
  return {
    cache: g.__jungtoVercelTtsCache,
    blockedUntil: g.__jungtoVercelTtsBlockedUntil,
  };
}

function setBlockedUntil(ts: number) {
  (globalThis as unknown as { __jungtoVercelTtsBlockedUntil?: number }).__jungtoVercelTtsBlockedUntil = ts;
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

  const rawText = typeof body.text === 'string' ? body.text.trim() : '';
  if (!rawText) {
    return Response.json({ error: 'TEXT_REQUIRED' }, { status: 400, headers: CORS_HEADERS });
  }

  const text = rawText.slice(0, 2500);
  const cacheKey = crypto
    .createHash('sha256')
    .update(`${TTS_MODEL}:${TTS_VOICE}:${text}`)
    .digest('hex');

  const { cache, blockedUntil } = getCacheState();
  const cached = cache.get(cacheKey);
  if (cached) {
    return new Response(Buffer.from(cached), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'audio/wav',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }

  const now = Date.now();
  if (now < blockedUntil) {
    const retryAfterSec = Math.max(1, Math.ceil((blockedUntil - now) / 1000));
    return Response.json(
      { error: 'QUOTA_EXCEEDED', retryAfterSec, fallback: true },
      { status: 429, headers: CORS_HEADERS }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return Response.json(
      { error: 'GEMINI_API_KEY_NOT_CONFIGURED', fallback: true },
      { status: 503, headers: CORS_HEADERS }
    );
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

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
      return Response.json(
        { error: 'EMPTY_TTS_AUDIO', fallback: true },
        { status: 502, headers: CORS_HEADERS }
      );
    }

    const wavBuffer = Buffer.from(base64Audio, 'base64');
    if (cache.size >= MAX_TTS_CACHE_ITEMS) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) cache.delete(oldestKey);
    }
    cache.set(cacheKey, wavBuffer);

    return new Response(wavBuffer, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'audio/wav',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    const anyErr = err as { status?: number; code?: number; message?: string };
    const msg = typeof anyErr?.message === 'string' ? anyErr.message : String(err ?? '');
    if (anyErr?.status === 429 || anyErr?.code === 429 || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      setBlockedUntil(Date.now() + 3600 * 1000);
      return Response.json(
        { error: 'QUOTA_EXCEEDED', retryAfterSec: 3600, fallback: true },
        { status: 429, headers: CORS_HEADERS }
      );
    }
    return Response.json(
      { error: 'TTS_GENERATION_FAILED', fallback: true },
      { status: 502, headers: CORS_HEADERS }
    );
  }
}
