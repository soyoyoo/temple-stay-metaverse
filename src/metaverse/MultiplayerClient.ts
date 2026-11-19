import type { AvatarActionType } from './PlayerAvatar';

export type TempleId = 'seocho' | 'mungyeong' | 'jukrim';

export interface RemotePlayerState {
  id: string;
  clientKey?: string;
  nickname: string;
  templeId: TempleId;
  x: number;
  y: number;
  z: number;
  rotY: number;
  action: AvatarActionType;
  isMoving: boolean;
  robeColor: number;
}

export interface PlayerSummary {
  id: string;
  nickname: string;
  templeId: TempleId;
  x: number;
  y: number;
  z: number;
  action: AvatarActionType;
}

export interface MultiplayerCallbacks {
  onInit?: (
    players: RemotePlayerState[],
    totalOnline: number,
    maxUsers: number,
    selfId: string,
    summary: PlayerSummary[]
  ) => void;
  onRoomSync?: (
    players: RemotePlayerState[],
    selfId?: string,
    summary?: PlayerSummary[]
  ) => void;
  onPlayerJoined?: (player: RemotePlayerState) => void;
  onPlayerUpdated?: (update: {
    id: string;
    x: number;
    y: number;
    z: number;
    rotY: number;
    action: AvatarActionType;
    isMoving: boolean;
  }) => void;
  onPlayerRenamed?: (id: string, nickname: string) => void;
  onPlayerLeft?: (id: string) => void;
  onPresenceCount?: (
    totalOnline: number,
    maxUsers: number,
    summary?: PlayerSummary[]
  ) => void;
  onRoomFull?: (message: string) => void;
}

const BROADCAST_CHANNEL_NAME = 'jungto_metaverse_room';
const BROADCAST_PEER_TTL_MS = 6000;
const ROBE_PALETTE = [
  0x787d82,
  0x8c8273,
  0x6b776e,
  0x707b84,
  0x877a6e,
  0x5f6b69,
  0x847e78,
];

function getApiBaseUrl(): string {
  try {
    const raw = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
      ?.VITE_API_BASE_URL;
    return typeof raw === 'string' ? raw.trim().replace(/\/+$/, '') : '';
  } catch {
    return '';
  }
}

function resolveApiUrl(path: string): string {
  const base = getApiBaseUrl();
  return base ? `${base}${path}` : path;
}

function resolveWsUrl(): string {
  const base = getApiBaseUrl();
  if (base) {
    const wsBase = base.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
    return `${wsBase}/ws`;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

function isKnownServerlessHostWithoutBackend(): boolean {
  if (getApiBaseUrl()) return false;
  if (typeof window === 'undefined') return false;
  return /(?:^|\.)vercel\.app$/i.test(window.location.hostname);
}

function hashColorIndex(clientKey: string): number {
  let hash = 0;
  for (let i = 0; i < clientKey.length; i++) {
    hash = (hash * 31 + clientKey.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % ROBE_PALETTE.length;
}

function getTabClientKey(): string {
  try {
    const existing = sessionStorage.getItem('jungto_tab_client_key');
    if (existing) return existing;
    const created = `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem('jungto_tab_client_key', created);
    return created;
  } catch {
    return `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

interface BroadcastPeerRecord extends RemotePlayerState {
  clientKey: string;
  lastSeen: number;
}

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private bc: BroadcastChannel | null = null;
  private callbacks: MultiplayerCallbacks;
  private nickname = '수행자';
  private clientKey = getTabClientKey();
  private selfId: string | null = null;
  private latestState: {
    templeId: TempleId;
    x: number;
    y: number;
    z: number;
    rotY: number;
    action: AvatarActionType;
    isMoving: boolean;
  } = {
    templeId: 'mungyeong',
    x: 0,
    y: 0,
    z: 18,
    rotY: 0,
    action: 'idle',
    isMoving: false,
  };

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private httpFallbackTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectDelay = 1200;
  private isDisposed = false;
  private lastSentAt = 0;
  private lastHttpSyncAt = 0;
  private lastBroadcastAt = 0;
  private prevSentKey = '';
  private hasReceivedInit = false;

  private wsDisabled = isKnownServerlessHostWithoutBackend();
  private wsHasOpenedOnce = false;
  private wsConsecutiveFailures = 0;
  private httpDisabled = false;
  private httpSyncInFlight = false;

  private lastServerPlayers: RemotePlayerState[] = [];
  private lastServerTotalOnline = 1;
  private lastServerMaxUsers = 100;
  private lastServerSummary: PlayerSummary[] = [];
  private broadcastPeers = new Map<string, BroadcastPeerRecord>();

  constructor(callbacks: MultiplayerCallbacks) {
    this.callbacks = callbacks;
  }

  public connect(
    nickname: string,
    initialState: {
      templeId: TempleId;
      x: number;
      y: number;
      z: number;
      rotY: number;
      action: AvatarActionType;
      isMoving: boolean;
    }
  ) {
    this.isDisposed = false;
    this.nickname = nickname;
    this.latestState = { ...initialState };
    this.initBroadcastChannel();
    if (!this.wsDisabled) {
      this.openSocket();
    }
    this.startTimers();
    this.postBroadcast('state');
    // Immediate HTTP bootstrap sync so peers appear instantaneously
    void this.runHttpSync();
  }

  private initBroadcastChannel() {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
    if (this.bc) return;
    try {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      bc.onmessage = (ev: MessageEvent) => {
        if (this.isDisposed) return;
        const msg = ev.data as Record<string, unknown> | null;
        if (!msg || typeof msg.clientKey !== 'string' || msg.clientKey === this.clientKey) {
          return;
        }
        const peerKey = msg.clientKey;
        if (msg.kind === 'leave') {
          const had = this.broadcastPeers.delete(peerKey);
          if (had) {
            this.emitMergedSync();
          }
          return;
        }

        if (msg.kind === 'state' || msg.kind === 'ping') {
          const templeId =
            msg.templeId === 'seocho' || msg.templeId === 'mungyeong' || msg.templeId === 'jukrim'
              ? msg.templeId
              : 'mungyeong';
          const peerId =
            typeof msg.selfId === 'string' && msg.selfId ? msg.selfId : `p-v-${peerKey}`;
          const prev = this.broadcastPeers.get(peerKey);
          this.broadcastPeers.set(peerKey, {
            id: prev?.id || peerId,
            clientKey: peerKey,
            nickname: typeof msg.nickname === 'string' ? msg.nickname : '수행자',
            templeId,
            x: Number(msg.x) || 0,
            y: Number(msg.y) || 0,
            z: Number(msg.z) || 18,
            rotY: Number(msg.rotY) || 0,
            action: (msg.action as AvatarActionType) || 'idle',
            isMoving: Boolean(msg.isMoving),
            robeColor:
              typeof msg.robeColor === 'number'
                ? msg.robeColor
                : ROBE_PALETTE[hashColorIndex(peerKey)],
            lastSeen: Date.now(),
          });

          if (msg.kind === 'state' && !prev) {
            // Reply so newly opened tab learns about us immediately
            this.postBroadcast('ping');
          }

          if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.emitMergedSync();
          }
        }
      };
      this.bc = bc;
    } catch {
      // BroadcastChannel may be blocked in restricted contexts
    }
  }

  private postBroadcast(kind: 'state' | 'ping' | 'leave') {
    if (!this.bc) return;
    try {
      this.bc.postMessage({
        kind,
        clientKey: this.clientKey,
        selfId: this.selfId,
        nickname: this.nickname,
        robeColor: ROBE_PALETTE[hashColorIndex(this.clientKey)],
        ...this.latestState,
      });
    } catch {
      // ignore
    }
  }

  private pruneBroadcastPeers() {
    const now = Date.now();
    for (const [k, v] of this.broadcastPeers.entries()) {
      if (now - v.lastSeen > BROADCAST_PEER_TTL_MS) {
        this.broadcastPeers.delete(k);
      }
    }
  }

  private mergeServerAndBroadcast(): {
    players: RemotePlayerState[];
    totalOnline: number;
    summary: PlayerSummary[];
  } {
    this.pruneBroadcastPeers();
    const byKey = new Map<string, RemotePlayerState>();

    for (const sp of this.lastServerPlayers) {
      const k = sp.clientKey || sp.id;
      byKey.set(k, sp);
    }

    const summaryById = new Map<string, PlayerSummary>();
    for (const s of this.lastServerSummary) {
      summaryById.set(s.id, s);
    }

    for (const bp of this.broadcastPeers.values()) {
      const existingServer = byKey.get(bp.clientKey);
      if (existingServer) {
        if (bp.templeId === this.latestState.templeId) {
          byKey.set(bp.clientKey, {
            ...existingServer,
            nickname: bp.nickname,
            x: bp.x,
            y: bp.y,
            z: bp.z,
            rotY: bp.rotY,
            action: bp.action,
            isMoving: bp.isMoving,
          });
        }
      } else {
        if (bp.templeId === this.latestState.templeId) {
          byKey.set(bp.clientKey, {
            id: bp.id,
            clientKey: bp.clientKey,
            nickname: bp.nickname,
            templeId: bp.templeId,
            x: bp.x,
            y: bp.y,
            z: bp.z,
            rotY: bp.rotY,
            action: bp.action,
            isMoving: bp.isMoving,
            robeColor: bp.robeColor,
          });
        }
        if (!summaryById.has(bp.id)) {
          summaryById.set(bp.id, {
            id: bp.id,
            nickname: bp.nickname,
            templeId: bp.templeId,
            x: bp.x,
            y: bp.y,
            z: bp.z,
            action: bp.action,
          });
        }
      }
    }

    const mergedPlayers = Array.from(byKey.values());
    const mergedSummary = Array.from(summaryById.values());
    const totalOnline = Math.max(
      1,
      this.lastServerTotalOnline,
      mergedSummary.length,
      mergedPlayers.length + 1
    );

    return {
      players: mergedPlayers,
      totalOnline,
      summary: mergedSummary,
    };
  }

  private emitMergedSync() {
    const { players, totalOnline, summary } = this.mergeServerAndBroadcast();
    if (!this.hasReceivedInit) {
      this.hasReceivedInit = true;
      this.callbacks.onInit?.(
        players,
        totalOnline,
        this.lastServerMaxUsers,
        this.selfId || `p-v-${this.clientKey}`,
        summary
      );
    } else {
      this.callbacks.onRoomSync?.(players, this.selfId || undefined, summary);
      this.callbacks.onPresenceCount?.(totalOnline, this.lastServerMaxUsers, summary);
    }
  }

  private startTimers() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (this.isDisposed) return;
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        } catch {
          // ignore
        }
      } else {
        this.postBroadcast('ping');
      }
    }, 4000);

    if (this.httpFallbackTimer) clearInterval(this.httpFallbackTimer);
    this.httpFallbackTimer = setInterval(() => {
      if (this.isDisposed || this.httpDisabled) return;
      // Use HTTP sync whenever WS is not open (serverless/blocked/reconnecting), or if init hasn't landed
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.hasReceivedInit) {
        void this.runHttpSync();
      }
    }, 900);
  }

  private async runHttpSync() {
    if (this.isDisposed || this.httpDisabled || this.httpSyncInFlight) return;
    this.httpSyncInFlight = true;
    this.lastHttpSyncAt = performance.now();
    try {
      const res = await fetch(resolveApiUrl('/api/multiplayer/sync'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientKey: this.clientKey,
          nickname: this.nickname,
          ...this.latestState,
        }),
      });
      if (this.isDisposed) return;
      if (res.status === 404 || res.status === 405) {
        // Static host without API routes: stop polling immediately to prevent 404 console spam
        this.httpDisabled = true;
        this.emitMergedSync();
        return;
      }
      if (res.status === 429) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        this.callbacks.onRoomFull?.(
          data?.message || '동시 접속 인원(100명)이 가득 찼습니다.'
        );
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as {
        selfId?: string;
        totalOnline?: number;
        maxUsers?: number;
        players?: RemotePlayerState[];
        allPlayersSummary?: PlayerSummary[];
      };
      if (data.selfId) this.selfId = data.selfId;

      this.lastServerPlayers = data.players || [];
      this.lastServerTotalOnline = Number(data.totalOnline) || 1;
      this.lastServerMaxUsers = Number(data.maxUsers) || 100;
      this.lastServerSummary = data.allPlayersSummary || [];

      // Only push HTTP player snapshots if WS isn't currently open & owning live updates
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.emitMergedSync();
      }
    } catch {
      // ignore transient network errors
    } finally {
      this.httpSyncInFlight = false;
    }
  }

  public requestRoomSync() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'sync:request' }));
    } else if (!this.httpDisabled) {
      void this.runHttpSync();
    } else {
      this.emitMergedSync();
    }
  }

  private openSocket() {
    if (this.isDisposed || this.wsDisabled) return;
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const wsUrl = resolveWsUrl();
    const ws = new WebSocket(wsUrl);
    this.ws = ws;

    ws.addEventListener('open', () => {
      this.wsHasOpenedOnce = true;
      this.wsConsecutiveFailures = 0;
      this.reconnectDelay = 1200;
      ws.send(
        JSON.stringify({
          type: 'join',
          clientKey: this.clientKey,
          nickname: this.nickname,
          ...this.latestState,
        })
      );
    });

    ws.addEventListener('message', (event) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (msg.type) {
        case 'init':
          this.hasReceivedInit = true;
          this.selfId = typeof msg.selfId === 'string' ? msg.selfId : this.selfId;
          this.lastServerPlayers = (msg.players as RemotePlayerState[]) || [];
          this.lastServerTotalOnline = Number(msg.totalOnline) || 1;
          this.lastServerMaxUsers = Number(msg.maxUsers) || 100;
          this.lastServerSummary = (msg.allPlayersSummary as PlayerSummary[]) || [];
          this.callbacks.onInit?.(
            this.lastServerPlayers,
            this.lastServerTotalOnline,
            this.lastServerMaxUsers,
            this.selfId || '',
            this.lastServerSummary
          );
          break;
        case 'room:sync':
          this.selfId = typeof msg.selfId === 'string' ? msg.selfId : this.selfId;
          this.lastServerPlayers = (msg.players as RemotePlayerState[]) || [];
          if (msg.allPlayersSummary) {
            this.lastServerSummary = msg.allPlayersSummary as PlayerSummary[];
          }
          this.callbacks.onRoomSync?.(
            this.lastServerPlayers,
            this.selfId || undefined,
            (msg.allPlayersSummary as PlayerSummary[]) || undefined
          );
          break;
        case 'player:joined':
          if (msg.player) {
            this.callbacks.onPlayerJoined?.(msg.player as RemotePlayerState);
          }
          break;
        case 'player:updated':
          this.callbacks.onPlayerUpdated?.({
            id: String(msg.id),
            x: Number(msg.x) || 0,
            y: Number(msg.y) || 0,
            z: Number(msg.z) || 0,
            rotY: Number(msg.rotY) || 0,
            action: (msg.action as AvatarActionType) || 'idle',
            isMoving: Boolean(msg.isMoving),
          });
          break;
        case 'player:renamed':
          this.callbacks.onPlayerRenamed?.(String(msg.id), String(msg.nickname || '수행자'));
          break;
        case 'player:left':
          this.callbacks.onPlayerLeft?.(String(msg.id));
          break;
        case 'presence:count':
          this.lastServerTotalOnline = Number(msg.totalOnline) || 1;
          this.lastServerMaxUsers = Number(msg.maxUsers) || 100;
          if (msg.allPlayersSummary) {
            this.lastServerSummary = msg.allPlayersSummary as PlayerSummary[];
          }
          this.callbacks.onPresenceCount?.(
            this.lastServerTotalOnline,
            this.lastServerMaxUsers,
            (msg.allPlayersSummary as PlayerSummary[]) || undefined
          );
          break;
        case 'room:full':
          this.callbacks.onRoomFull?.(
            String(msg.message || '동시 접속 인원(100명)이 가득 찼습니다.')
          );
          this.isDisposed = true;
          break;
      }
    });

    ws.addEventListener('close', () => {
      if (this.ws === ws) {
        this.ws = null;
      }
      if (!this.isDisposed) {
        if (!this.wsHasOpenedOnce) {
          this.wsConsecutiveFailures += 1;
          if (this.wsConsecutiveFailures >= 2 && !getApiBaseUrl()) {
            // Host does not support WebSocket upgrades; fall back cleanly to HTTP + BroadcastChannel
            this.wsDisabled = true;
            return;
          }
        }
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
          this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 8000);
          this.openSocket();
        }, this.reconnectDelay);
      }
    });

    ws.addEventListener('error', () => {
      // Close triggers reconnect / HTTP fallback automatically
    });
  }

  public sendNickname(nickname: string) {
    this.nickname = nickname;
    this.postBroadcast('state');
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'nickname', nickname }));
    } else if (!this.httpDisabled) {
      void this.runHttpSync();
    }
  }

  public sendState(
    state: {
      templeId: TempleId;
      x: number;
      y: number;
      z: number;
      rotY: number;
      action: AvatarActionType;
      isMoving: boolean;
    },
    forceImmediate = false
  ) {
    const templeChanged = state.templeId !== this.latestState.templeId;
    const actionChanged = state.action !== this.latestState.action;
    this.latestState = { ...state };

    const now = performance.now();
    const stateKey = `${state.templeId}|${state.x.toFixed(2)}|${state.y.toFixed(2)}|${state.z.toFixed(2)}|${state.rotY.toFixed(2)}|${state.action}|${state.isMoving}`;

    if (now - this.lastBroadcastAt >= 65 || templeChanged || actionChanged || forceImmediate) {
      this.lastBroadcastAt = now;
      this.postBroadcast('state');
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (stateKey === this.prevSentKey && !forceImmediate) return;
      if (!forceImmediate && !templeChanged && !actionChanged && now - this.lastSentAt < 70) {
        return;
      }
      this.lastSentAt = now;
      this.prevSentKey = stateKey;
      this.ws.send(
        JSON.stringify({
          type: 'state',
          ...state,
        })
      );
      return;
    }

    if (!this.httpDisabled) {
      if (
        forceImmediate ||
        templeChanged ||
        actionChanged ||
        (stateKey !== this.prevSentKey && now - this.lastHttpSyncAt >= 280)
      ) {
        this.prevSentKey = stateKey;
        void this.runHttpSync();
      }
    }
  }

  public dispose() {
    this.isDisposed = true;
    this.postBroadcast('leave');
    if (this.bc) {
      try {
        this.bc.close();
      } catch {
        // ignore
      }
      this.bc = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.httpFallbackTimer) {
      clearInterval(this.httpFallbackTimer);
      this.httpFallbackTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
  }
}
