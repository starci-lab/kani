import { Injectable } from "@nestjs/common"

@Injectable()
export class RandomDelayService {
    async waitRandom(min = 0, max = 1000): Promise<void> {
        const delay = Math.floor(Math.random() * (max - min + 1)) + min
        return new Promise(resolve => setTimeout(resolve, delay))
    }
}