import { SetMetadata } from '@nestjs/common';

export const THROTTLE_BY_EMAIL_KEY = 'throttle:by-email';
export const ThrottleByEmail = () => SetMetadata(THROTTLE_BY_EMAIL_KEY, true);
