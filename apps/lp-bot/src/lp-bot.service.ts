import { Injectable } from '@nestjs/common';

@Injectable()
export class LpBotService {
  getHello(): string {
    return 'Hello World!';
  }
}
