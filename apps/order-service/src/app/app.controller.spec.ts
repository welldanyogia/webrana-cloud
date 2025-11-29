import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();
  });

  describe('getHealth', () => {
    it('should return health status', () => {
      const appController = app.get<AppController>(AppController);
      const result = appController.getHealth();
      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('service', 'order-service');
      expect(result).toHaveProperty('timestamp');
    });
  });
});
