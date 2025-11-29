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
    it('should return health object with status ok', () => {
      const result = service.getHealth();
      expect(result.status).toBe('ok');
      expect(result.service).toBe('billing-service');
      expect(result.timestamp).toBeDefined();
    });

    it('should return valid ISO timestamp', () => {
      const result = service.getHealth();
      const timestamp = new Date(result.timestamp);
      expect(timestamp.toISOString()).toBe(result.timestamp);
    });
  });
});
