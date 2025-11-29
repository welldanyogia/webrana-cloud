import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload {
  userId: string;
  email?: string;
  role?: string;
}

/**
 * Custom decorator to extract current user from request
 * 
 * Usage:
 * ```typescript
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * getProfile(@CurrentUser() user: CurrentUserPayload) {
 *   return user;
 * }
 * 
 * // Or get specific field
 * @Get('my-orders')
 * @UseGuards(JwtAuthGuard)
 * getMyOrders(@CurrentUser('userId') userId: string) {
 *   return this.orderService.findByUser(userId);
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
