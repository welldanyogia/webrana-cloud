import { Test, TestingModule } from '@nestjs/testing';

import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  describe('getHealth', () => {
    it('should return health check response', () => {
      const result = service.getHealth();

      expect(result).toEqual({
        status: 'ok',
        service: 'instance-service',
        timestamp: expect.any(String),
      });
    });

    it('should return valid ISO timestamp', () => {
      const result = service.getHealth();
      const date = new Date(result.timestamp);

      expect(date.toString()).not.toBe('Invalid Date');
    });
  });
});
