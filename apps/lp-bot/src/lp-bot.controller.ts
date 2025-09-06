import { Controller, Get } from '@nestjs/common';
import { LpBotService } from './lp-bot.service';

@Controller()
export class LpBotController {
  constructor(private readonly lpBotService: LpBotService) {}

  @Get()
  getHello(): string {
    return this.lpBotService.getHello();
  }
}
