import type { AvatarActionType } from './PlayerAvatar';

export type TempleId = 'seocho' | 'mungyeong' | 'jukrim';

export interface RemotePlayerState {
  id: string;
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

export interface MultiplayerCallbacks {
  onInit?: (players: RemotePlayerState[], totalOnline: number, maxUsers: number) => void;
  onRoomSync?: (players: RemotePlayerState[]) => void;
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
  onPresenceCount?: (totalOnline: number, maxUsers: number) => void;
  onRoomFull?: (message: string) => void;
}

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private callbacks: MultiplayerCallbacks;
  private nickname = '수행자';
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
  private reconnectDelay = 1200;
  private isDisposed = false;
  private lastSentAt = 0;
  private prevSentKey = '';

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
    this.openSocket();
  }

  private openSocket() {
    if (this.isDisposed) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    this.ws = ws;

    ws.addEventListener('open', () => {
      this.reconnectDelay = 1200;
      ws.send(
        JSON.stringify({
          type: 'join',
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
          this.callbacks.onInit?.(
            (msg.players as RemotePlayerState[]) || [],
            Number(msg.totalOnline) || 1,
            Number(msg.maxUsers) || 100
          );
          break;
        case 'room:sync':
          this.callbacks.onRoomSync?.((msg.players as RemotePlayerState[]) || []);
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
          this.callbacks.onPresenceCount?.(
            Number(msg.totalOnline) || 1,
            Number(msg.maxUsers) || 100
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
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
          this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 8000);
          this.openSocket();
        }, this.reconnectDelay);
      }
    });

    ws.addEventListener('error', () => {
      // Close triggers reconnect cleanly
    });
  }

  public sendNickname(nickname: string) {
    this.nickname = nickname;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'nickname', nickname }));
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

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const now = performance.now();
    const stateKey = `${state.templeId}|${state.x.toFixed(2)}|${state.y.toFixed(2)}|${state.z.toFixed(2)}|${state.rotY.toFixed(2)}|${state.action}|${state.isMoving}`;

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
  }

  public dispose() {
    this.isDisposed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
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
