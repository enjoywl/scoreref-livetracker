type Status = 'disconnected' | 'connecting' | 'connected' | 'error';
type MessageHandler = (data: unknown) => void;
type StatusHandler = (status: Status) => void;

/**
 * 极简 STOMP 1.2 over WebSocket 客户端
 * 对接 hypersports-ws-service 的 /ws 端点(由 dev worker 代理 /v1/soccer/ws → localhost:7070/ws)。
 * 只实现 CONNECT / SUBSCRIBE / UNSUBSCRIBE / DISCONNECT 与 MESSAGE 分发;
 * heart-beat 协商 0,0(禁用),ack 模式 auto。
 */
export class WebSocketClient {
  #url: string;
  #ws: WebSocket | null = null;
  #status: Status = 'disconnected';
  #onMessage: MessageHandler | null = null;
  #onStatusChange: StatusHandler | null = null;
  #pendingSubs: string[] = [];
  #subs = new Map<string, string>(); // destination -> subscription id
  #subSeq = 0;
  #buffer = '';
  #connectPromise: Promise<void> | null = null;

  constructor(url: string) {
    this.#url = url;
  }

  get status(): Status { return this.#status; }
  get isConnected(): boolean { return this.#status === 'connected'; }

  set onMessage(fn: MessageHandler) { this.#onMessage = fn; }
  set onStatusChange(fn: StatusHandler) { this.#onStatusChange = fn; }

  connect(): Promise<void> | undefined {
    if (this.#ws && (this.#ws.readyState === WebSocket.OPEN || this.#ws.readyState === WebSocket.CONNECTING)) {
      return this.#connectPromise ?? undefined;
    }
    this.#setStatus('connecting');
    this.#connectPromise = new Promise((resolve, reject) => {
      this.#ws = new WebSocket(this.#url);
      this.#ws.onopen = () => {
        this.#sendFrame('CONNECT', { 'accept-version': '1.2', 'heart-beat': '0,0' });
      };
      this.#ws.onmessage = (event) => {
        this.#buffer += event.data as string;
        // STOMP 帧以 \x00 结尾,可能多个帧粘在一个 WS 消息里
        let idx: number;
        while ((idx = this.#buffer.indexOf('\x00')) >= 0) {
          const frame = this.#buffer.slice(0, idx).replace(/^\n+/, '');
          this.#buffer = this.#buffer.slice(idx + 1);
          this.#handleFrame(frame, resolve, reject);
        }
      };
      this.#ws.onerror = () => {
        this.#setStatus('error');
        reject(new Error('WebSocket error'));
      };
      this.#ws.onclose = () => {
        this.#setStatus('disconnected');
        this.#ws = null;
        this.#subs.clear();
      };
    });
    return this.#connectPromise;
  }

  disconnect(): void {
    if (this.#ws) {
      try { this.#sendFrame('DISCONNECT', {}); } catch { /* closing anyway */ }
      this.#ws.onclose = null;
      this.#ws.close();
      this.#ws = null;
    }
    this.#setStatus('disconnected');
    this.#connectPromise = null;
    this.#pendingSubs = [];
    this.#subs.clear();
    this.#buffer = '';
  }

  /** 订阅 STOMP destination,如 /topic/live-tracker/{matchId};连接前调用会排队 */
  subscribe(destination: string): void {
    if (this.#status === 'connected') {
      this.#doSubscribe(destination);
    } else if (!this.#pendingSubs.includes(destination)) {
      this.#pendingSubs.push(destination);
    }
  }

  /** 发送 STOMP SEND 帧到 application 目的地(如 /app/live-tracker/subscribe) */
  send(destination: string, body: unknown): void {
    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    this.#sendFrame('SEND', {
      destination,
      'content-type': 'application/json',
      'content-length': String(payload.length),
    }, payload);
  }

  unsubscribe(destination: string): void {
    const id = this.#subs.get(destination);
    if (id && this.#status === 'connected') {
      this.#sendFrame('UNSUBSCRIBE', { id });
    }
    this.#subs.delete(destination);
    this.#pendingSubs = this.#pendingSubs.filter((d) => d !== destination);
  }

  #doSubscribe(destination: string): void {
    if (this.#subs.has(destination)) return;
    const id = `sub-${this.#subSeq++}`;
    this.#subs.set(destination, id);
    this.#sendFrame('SUBSCRIBE', { id, destination, ack: 'auto' });
  }

  #handleFrame(frame: string, resolve: () => void, reject: (e: Error) => void): void {
    if (!frame) return; // 心跳(纯换行)
    const blank = frame.indexOf('\n\n');
    const headerPart = blank >= 0 ? frame.slice(0, blank) : frame;
    const body = blank >= 0 ? frame.slice(blank + 2) : '';
    const command = headerPart.split('\n')[0];
    if (command === 'CONNECTED') {
      this.#setStatus('connected');
      for (const dest of this.#pendingSubs.splice(0)) this.#doSubscribe(dest);
      resolve();
    } else if (command === 'MESSAGE') {
      try {
        if (this.#onMessage) this.#onMessage(JSON.parse(body));
      } catch { /* ignore unparseable messages */ }
    } else if (command === 'ERROR') {
      this.#setStatus('error');
      reject(new Error(`STOMP error: ${body}`));
    }
  }

  #sendFrame(command: string, headers: Record<string, string>, body = ''): void {
    if (!this.#ws || this.#ws.readyState !== WebSocket.OPEN) return;
    const headerLines = Object.entries(headers).map(([k, v]) => `${k}:${v}`);
    this.#ws.send([command, ...headerLines].join('\n') + '\n\n' + body + '\x00');
  }

  #setStatus(s: Status): void {
    if (this.#status !== s) {
      this.#status = s;
      if (this.#onStatusChange) this.#onStatusChange(s);
    }
  }
}
