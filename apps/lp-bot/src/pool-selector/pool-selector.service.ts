import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import { MemDbService } from "@modules/databases"
import { EventName, EventEmitterService } from "@modules/event"
import { CoinMarketCapPriceResponse } from "@modules/blockchains"
import { sleep } from "@modules/common"
import { OnEvent } from "@nestjs/event-emitter"

// pool selector is the service that selects the best pool for a given token
@Injectable()
export class PoolSelectorService implements OnApplicationBootstrap {
    constructor(
        private readonly memDbService: MemDbService,
        private readonly eventEmitterService: EventEmitterService,
    ) {}

    async onApplicationBootstrap() {
        await sleep(1000)
        console.log("event emitted")
        this.eventEmitterService.emit(EventName.PoolsUpdated, "demo")
    }

    @OnEvent(EventName.PoolsUpdated)
    handlePoolsUpdated(prices: Array<CoinMarketCapPriceResponse>) {
        console.log(prices)
    }
}