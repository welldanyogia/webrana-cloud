/**
 * Mock for socket.io
 * Used in tests when the actual package is not installed
 */

export class Server {
  private handlers: Map<string, Function[]> = new Map();

  constructor(_httpServer?: unknown, _options?: unknown) {}

  on(event: string, handler: Function): this {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
    return this;
  }

  emit(event: string, ...args: unknown[]): boolean {
    return true;
  }

  to(room: string): this {
    return this;
  }

  in(room: string): this {
    return this;
  }

  of(namespace: string): this {
    return this;
  }

  close(): void {}
}

export class Socket {
  id: string = 'mock-socket-id';
  handshake: { query: Record<string, string>; headers: Record<string, string> } = {
    query: {},
    headers: {},
  };
  rooms: Set<string> = new Set();

  join(room: string): void {
    this.rooms.add(room);
  }

  leave(room: string): void {
    this.rooms.delete(room);
  }

  emit(event: string, ...args: unknown[]): boolean {
    return true;
  }

  on(event: string, handler: Function): this {
    return this;
  }

  disconnect(close?: boolean): this {
    return this;
  }
}

export default { Server, Socket };
