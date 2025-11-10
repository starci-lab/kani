import { Injectable } from "@nestjs/common"

@Injectable()
export class BotExecutorService {
    getHello(): string {
        return "Hello World!"
    }
}
