import { Module } from '@nestjs/common';
import { LpBotController } from './lp-bot.controller';
import { LpBotService } from './lp-bot.service';

@Module({
  imports: [],
  controllers: [LpBotController],
  providers: [LpBotService],
})
export class LpBotModule {}
