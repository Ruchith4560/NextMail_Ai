/**
 * Lightweight, resilient STOMP-over-WebSocket client.
 * Connects to Spring Boot /ws STOMP broker with JWT authentication,
 * automatic subscription restoration, and exponential backoff reconnection.
 */

type MessageCallback = (payload: any) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: any = null;
  private subscriptions = new Map<string, { destination: string; callback: MessageCallback }>();
  private subCounter = 0;
  private token: string | null = null;

  connect(token: string) {
    this.token = token;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // If running in development with Vite proxy or direct port 8080:
    const host = window.location.hostname === 'localhost' ? 'localhost:8080' : window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.sendFrame('CONNECT', {
          'accept-version': '1.2,1.1,1.0',
          'heart-beat': '10000,10000',
          'Authorization': `Bearer ${token}`,
        });
      };

      this.socket.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        this.scheduleReconnect();
      };

      this.socket.onerror = (err) => {
        console.warn('WebSocket connection warning:', err);
      };
    } catch (err) {
      console.warn('Failed to initiate WebSocket connection:', err);
      this.scheduleReconnect();
    }
  }

  private handleMessage(data: string) {
    const lines = data.split('\n');
    const command = lines[0].trim();

    if (command === 'CONNECTED') {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('STOMP WebSocket: Connected successfully');

      // Resubscribe all active listeners upon reconnection
      this.subscriptions.forEach((sub, subId) => {
        this.sendFrame('SUBSCRIBE', {
          id: subId,
          destination: sub.destination,
        });
      });
    } else if (command === 'MESSAGE') {
      // Find blank line dividing headers from body
      let bodyIndex = lines.findIndex((l) => l.trim() === '');
      let body = '';
      if (bodyIndex !== -1) {
        body = lines.slice(bodyIndex + 1).join('\n');
        // Strip trailing null character
        if (body.endsWith('\0')) {
          body = body.slice(0, -1);
        }
      }

      // Extract subscription ID from headers
      let subId = '';
      for (let i = 1; i < bodyIndex; i++) {
        const [k, v] = lines[i].split(':');
        if (k && k.trim() === 'subscription') {
          subId = v.trim();
        }
      }

      if (subId && this.subscriptions.has(subId)) {
        try {
          const parsed = JSON.parse(body);
          this.subscriptions.get(subId)?.callback(parsed);
        } catch {
          this.subscriptions.get(subId)?.callback(body);
        }
      } else {
        // Broadcast to all matching destination subscribers
        this.subscriptions.forEach((sub) => {
          try {
            const parsed = JSON.parse(body);
            sub.callback(parsed);
          } catch {
            sub.callback(body);
          }
        });
      }
    }
  }

  subscribe(destination: string, callback: MessageCallback): () => void {
    const subId = `sub-${++this.subCounter}`;
    this.subscriptions.set(subId, { destination, callback });

    if (this.isConnected) {
      this.sendFrame('SUBSCRIBE', {
        id: subId,
        destination,
      });
    }

    // Return un-subscriber
    return () => {
      if (this.isConnected) {
        this.sendFrame('UNSUBSCRIBE', { id: subId });
      }
      this.subscriptions.delete(subId);
    };
  }

  private sendFrame(command: string, headers: Record<string, string>, body = '') {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    let frame = `${command}\n`;
    Object.entries(headers).forEach(([k, v]) => {
      frame += `${k}:${v}\n`;
    });
    frame += '\n';
    if (body) {
      frame += body;
    }
    frame += '\0';

    this.socket.send(frame);
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || !this.token) return;

    const delay = Math.min(30000, 1000 * Math.pow(1.5, this.reconnectAttempts++));
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.token) {
        console.log(`STOMP WebSocket: Reconnecting (attempt ${this.reconnectAttempts})...`);
        this.connect(this.token);
      }
    }, delay);
  }

  disconnect() {
    clearTimeout(this.reconnectTimer);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
    this.subscriptions.clear();
    this.token = null;
  }
}

export const webSocketService = new WebSocketService();
