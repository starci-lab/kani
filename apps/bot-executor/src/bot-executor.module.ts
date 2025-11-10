import { Module } from '@nestjs/common';
import { BotExecutorController } from './bot-executor.controller';
import { BotExecutorService } from './bot-executor.service';

@Module({
  imports: [],
  controllers: [BotExecutorController],
  providers: [BotExecutorService],
})
export class BotExecutorModule {}
