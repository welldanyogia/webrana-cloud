import { Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import Redis from 'ioredis';

@Injectable()
export class ThrottlerRedisStorage implements ThrottlerStorage {
  private readonly redis: Redis;
  private readonly scriptSha: string | null = null;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          return null;
        }
        return Math.min(times * 100, 1000);
      },
    });
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<{
    totalHits: number;
    timeToExpire: number;
    isBlocked: boolean;
    timeToBlockExpire: number;
  }> {
    console.log(`📊 ThrottlerRedisStorage.increment() - key: ${key}, ttl: ${ttl}ms, limit: ${limit}`);

    // Increment the hit count for this key
    const totalHits = await this.redis.incr(key);

    // If this is the first hit, set the TTL
    const currentTtl = await this.redis.ttl(key);
    if (currentTtl === -1) {
      // Key exists but has no expiry, set it (ttl is in milliseconds, pexpire expects ms)
      await this.redis.pexpire(key, ttl);
    }

    // Get the remaining TTL in seconds
    const ttlSeconds = await this.redis.ttl(key);
    const timeToExpire = ttlSeconds > 0 ? ttlSeconds * 1000 : 0;

    // Calculate if this request should be blocked
    const isBlocked = totalHits > limit;
    const timeToBlockExpire = isBlocked ? timeToExpire : 0;

    console.log(`📊 ThrottlerRedisStorage - totalHits: ${totalHits}/${limit}, isBlocked: ${isBlocked}, timeToExpire: ${timeToExpire}ms`);

    return {
      totalHits,
      timeToExpire,
      isBlocked,
      timeToBlockExpire,
    };
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
