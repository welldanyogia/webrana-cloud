import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserData {
  userId: string;
  email?: string;
  role?: string;
}

/**
 * @CurrentUser() Parameter Decorator
 * 
 * Extracts the authenticated user's data from the request object.
 * Must be used with JwtAuthGuard which attaches user data to request.
 * 
 * Usage:
 * ```typescript
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * getProfile(@CurrentUser() user: CurrentUserData) {
 *   return { userId: user.userId };
 * }
 * 
 * // Or extract specific field
 * @Get('orders')
 * @UseGuards(JwtAuthGuard)
 * getOrders(@CurrentUser('userId') userId: string) {
 *   return this.orderService.getOrdersByUserId(userId);
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserData | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentUserData;

    if (!user) {
      return null;
    }

    // If specific field requested, return just that field
    if (data) {
      return user[data];
    }

    // Otherwise return full user object
    return user;
  }
);
