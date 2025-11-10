import { Test, TestingModule } from '@nestjs/testing';
import { BotExecutorController } from './bot-executor.controller';
import { BotExecutorService } from './bot-executor.service';

describe('BotExecutorController', () => {
  let botExecutorController: BotExecutorController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [BotExecutorController],
      providers: [BotExecutorService],
    }).compile();

    botExecutorController = app.get<BotExecutorController>(BotExecutorController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(botExecutorController.getHello()).toBe('Hello World!');
    });
  });
});
