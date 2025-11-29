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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return health data with correct structure', () => {
      const result = service.getHealth();
      
      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('service', 'gateway');
      expect(result).toHaveProperty('timestamp');
    });

    it('should return valid ISO timestamp', () => {
      const result = service.getHealth();
      const timestamp = new Date(result.timestamp);
      expect(timestamp.toISOString()).toBe(result.timestamp);
    });
  });
});
