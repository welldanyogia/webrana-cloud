import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload {
  userId: string;
  email?: string;
  role?: string;
}

/**
 * Decorator to extract the current authenticated user from the request
 * 
 * Usage:
 * ```typescript
 * @Get()
 * async getNotifications(@CurrentUser() user: CurrentUserPayload) {
 *   // user.userId is available
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentUserPayload;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  }
);
