import { Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import * as jwt from 'jsonwebtoken';
import { Server, Socket } from 'socket.io';

import { JwtPayload } from '../../common/guards/jwt-auth.guard';

/**
 * WebSocket Gateway for real-time notifications
 * 
 * Clients connect to the `/notifications` namespace with a JWT token
 * in the handshake query or auth header.
 * 
 * Events emitted to clients:
 * - `notification:new` - New notification created
 * - `notification:unread-count` - Updated unread count
 */
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  // Map userId -> Set of socketIds (user can have multiple connections)
  private userSockets = new Map<string, Set<string>>();

  // Map socketId -> userId (for quick lookup on disconnect)
  private socketUserMap = new Map<string, string>();

  private readonly algorithm: jwt.Algorithm;
  private readonly publicKey: string;
  private readonly secret: string;

  constructor(private readonly configService: ConfigService) {
    this.algorithm = this.configService.get<jwt.Algorithm>(
      'JWT_ALGORITHM',
      'RS256'
    );
    this.publicKey = this.configService.get<string>('JWT_PUBLIC_KEY', '');
    this.secret = this.configService.get<string>('JWT_SECRET', '');
  }

  afterInit(): void {
    this.logger.log('WebSocket Gateway initialized');
  }

  /**
   * Handle new client connection
   * Verify JWT token from handshake and register user socket
   */
  async handleConnection(client: Socket): Promise<void> {
    try {
      const userId = this.authenticateClient(client);
      
      // Register the socket for this user
      this.registerSocket(userId, client.id);
      
      // Join a room named after the userId for easy targeting
      client.join(`user:${userId}`);
      
      this.logger.log(
        `Client connected: socketId=${client.id}, userId=${userId}`
      );
    } catch (error) {
      this.logger.warn(
        `Connection rejected: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect(true);
    }
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket): void {
    const userId = this.socketUserMap.get(client.id);
    
    if (userId) {
      this.unregisterSocket(userId, client.id);
      this.logger.log(
        `Client disconnected: socketId=${client.id}, userId=${userId}`
      );
    } else {
      this.logger.log(`Unknown client disconnected: socketId=${client.id}`);
    }
  }

  /**
   * Push a new notification to a specific user
   */
  async pushToUser(userId: string, notification: any): Promise<void> {
    this.server.to(`user:${userId}`).emit('notification:new', notification);
    this.logger.debug(`Pushed notification to user ${userId}`);
  }

  /**
   * Update unread count for a specific user
   */
  async updateUnreadCount(userId: string, count: number): Promise<void> {
    this.server.to(`user:${userId}`).emit('notification:unread-count', { count });
    this.logger.debug(`Updated unread count for user ${userId}: ${count}`);
  }

  /**
   * Check if a user has any active connections
   */
  isUserConnected(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return sockets !== undefined && sockets.size > 0;
  }

  /**
   * Get the number of connected sockets for a user
   */
  getUserSocketCount(userId: string): number {
    return this.userSockets.get(userId)?.size ?? 0;
  }

  /**
   * Authenticate client by verifying JWT from handshake
   */
  private authenticateClient(client: Socket): string {
    // Try to get token from query params or auth header
    const token =
      (client.handshake.query.token as string) ||
      client.handshake.auth?.token ||
      this.extractBearerToken(client.handshake.headers.authorization);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    const payload = this.verifyToken(token);
    return payload.sub;
  }

  /**
   * Extract bearer token from authorization header
   */
  private extractBearerToken(authorization?: string): string | null {
    if (!authorization) return null;
    const [type, token] = authorization.split(' ');
    return type === 'Bearer' ? token : null;
  }

  /**
   * Verify JWT token
   */
  private verifyToken(token: string): JwtPayload {
    if (this.algorithm === 'HS256') {
      if (!this.secret) {
        throw new UnauthorizedException('JWT_SECRET not configured');
      }
      return jwt.verify(token, this.secret, {
        algorithms: ['HS256'],
      }) as JwtPayload;
    }

    if (!this.publicKey) {
      throw new UnauthorizedException('JWT_PUBLIC_KEY not configured');
    }
    return jwt.verify(token, this.publicKey, {
      algorithms: ['RS256'],
    }) as JwtPayload;
  }

  /**
   * Register a socket for a user
   */
  private registerSocket(userId: string, socketId: string): void {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
    this.socketUserMap.set(socketId, userId);
  }

  /**
   * Unregister a socket for a user
   */
  private unregisterSocket(userId: string, socketId: string): void {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
    this.socketUserMap.delete(socketId);
  }
}
