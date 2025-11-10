import { Controller, Get } from '@nestjs/common';
import { BotExecutorService } from './bot-executor.service';

@Controller()
export class BotExecutorController {
  constructor(private readonly botExecutorService: BotExecutorService) {}

  @Get()
  getHello(): string {
    return this.botExecutorService.getHello();
  }
}
