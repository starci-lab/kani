import { 
    createEventName, 
    DlmmLiquidityPoolsFetchedEvent, 
    EventName, 
    LiquidityPoolsFetchedEvent
} from "@modules/event"
import { Inject, Injectable, Scope } from "@nestjs/common"
import { REQUEST } from "@nestjs/core"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { Mutex } from "async-mutex"
import { createReadinessWatcherName, ReadinessWatcherFactoryService } from "@modules/mixin"

@Injectable({
    scope: Scope.REQUEST,
    durable: true,
})
export class DistributorProcessorService {
    private mutex: Mutex

    constructor(
        // The request object injected into this processor. It contains
        // the `user` instance for whom the processor is running.
        @Inject(REQUEST)
        private readonly request: DistributorProcessorRequest,
        private readonly eventEmitter: EventEmitter2,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
    ) {}    

    async initialize() {
        this.readinessWatcherFactoryService.createWatcher(
            createReadinessWatcherName(DistributorProcessorService.name, {
                botId: this.request.botId,
            }))
        this.eventEmitter.on(
            EventName.InternalDlmmLiquidityPoolsFetched,
            async (payload: DlmmLiquidityPoolsFetchedEvent) => {
                this.eventEmitter.emit(
                    createEventName(
                        EventName.DistributedDlmmLiquidityPoolsFetched, 
                        {
                            botId: this.request.botId,
                        }),
                    payload,
                )
            })
        this.eventEmitter.on(
            EventName.InternalLiquidityPoolsFetched,
            async (payload: LiquidityPoolsFetchedEvent) => {
                this.eventEmitter.emit(
                    createEventName(
                        EventName.DistributedLiquidityPoolsFetched, 
                        {
                            botId: this.request.botId,
                        }),
                    payload,
                )
            })
        this.readinessWatcherFactoryService.setReady(
            createReadinessWatcherName(DistributorProcessorService.name, {
                botId: this.request.botId,
            }))
    }
}

export interface DistributorProcessorRequest {
    botId: string
}