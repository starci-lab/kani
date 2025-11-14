import { Injectable } from "@nestjs/common"
import { PrimaryMemoryStorageService } from "@modules/databases"
import { EventName, LiquidityPoolsFetchedEvent } from "@modules/event"
import { OnEvent } from "@nestjs/event-emitter"

// open position processor service is to process the open position of the liquidity pools
// to determine if a liquidity pool is eligible to open a position
@Injectable()
export class OpenPositionProcessorService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    @OnEvent(EventName.InternalLiquidityPoolsFetched)
    async handleInternalLiquidityPoolsFetched(
        event: LiquidityPoolsFetchedEvent
    ) {
        console.log(event)
    }
}