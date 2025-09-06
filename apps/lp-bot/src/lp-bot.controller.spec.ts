import { Test, TestingModule } from '@nestjs/testing';
import { LpBotController } from './lp-bot.controller';
import { LpBotService } from './lp-bot.service';

describe('LpBotController', () => {
  let lpBotController: LpBotController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [LpBotController],
      providers: [LpBotService],
    }).compile();

    lpBotController = app.get<LpBotController>(LpBotController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(lpBotController.getHello()).toBe('Hello World!');
    });
  });
});
