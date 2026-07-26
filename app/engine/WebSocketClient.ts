type Status = 'disconnected' | 'connecting' | 'connected' | 'error';
type MessageHandler = (data: unknown) => void;
type StatusHandler = (status: Status) => void;

export class WebSocketClient {
  #url: string;
  #ws: WebSocket | null = null;
  #status: Status = 'disconnected';
  #onMessage: MessageHandler | null = null;
  #onStatusChange: StatusHandler | null = null;
  #pendingMessages: string[] = [];
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
        this.#setStatus('connected');
        this.#flushPending();
        resolve();
      };
      this.#ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);
          if (this.#onMessage) this.#onMessage(data);
        } catch { /* ignore unparseable messages */ }
      };
      this.#ws.onerror = () => {
        this.#setStatus('error');
        reject(new Error('WebSocket error'));
      };
      this.#ws.onclose = () => {
        this.#setStatus('disconnected');
        this.#ws = null;
      };
    });
    return this.#connectPromise;
  }

  disconnect(): void {
    if (this.#ws) {
      this.#ws.onclose = null;
      this.#ws.close();
      this.#ws = null;
    }
    this.#setStatus('disconnected');
    this.#connectPromise = null;
    this.#pendingMessages = [];
  }

  subscribe(channel: string): void { this.#send({ type: 'subscribe', channel }); }
  unsubscribe(channel: string): void { this.#send({ type: 'unsubscribe', channel }); }

  #send(obj: Record<string, string>): void {
    const msg = JSON.stringify(obj);
    if (this.#ws && this.#ws.readyState === WebSocket.OPEN) {
      this.#ws.send(msg);
    } else {
      this.#pendingMessages.push(msg);
    }
  }

  #flushPending(): void {
    while (this.#pendingMessages.length && this.#ws && this.#ws.readyState === WebSocket.OPEN) {
      this.#ws.send(this.#pendingMessages.shift()!);
    }
  }

  #setStatus(s: Status): void {
    if (this.#status !== s) {
      this.#status = s;
      if (this.#onStatusChange) this.#onStatusChange(s);
    }
  }
}
