/**
 * Mock for @nestjs/websockets
 * Used in tests when the actual package is not installed
 */

export const WebSocketGateway = (options?: unknown) => {
  return (target: unknown) => target;
};

export const WebSocketServer = () => {
  return (_target: unknown, _propertyKey: string) => {};
};

export const SubscribeMessage = (message: string) => {
  return (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) => {
    return descriptor;
  };
};

export const MessageBody = () => {
  return (_target: unknown, _propertyKey: string, _parameterIndex: number) => {};
};

export const ConnectedSocket = () => {
  return (_target: unknown, _propertyKey: string, _parameterIndex: number) => {};
};

export const OnGatewayInit = class {};
export const OnGatewayConnection = class {};
export const OnGatewayDisconnect = class {};

export const WsResponse = class {
  event: string;
  data: unknown;
};

export const WsException = class extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WsException';
  }
};
