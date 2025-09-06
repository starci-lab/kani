import { NestFactory } from '@nestjs/core';
import { LpBotModule } from './lp-bot.module';

async function bootstrap() {
  const app = await NestFactory.create(LpBotModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
