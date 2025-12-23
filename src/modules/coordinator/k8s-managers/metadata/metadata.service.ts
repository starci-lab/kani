import { Inject, Injectable, Scope } from "@nestjs/common"
import { REQUEST } from "@nestjs/core"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"

@Injectable({
    scope: Scope.REQUEST,
    durable: true,
})
export class MetadataManagerService  {
    constructor(
        // The request object injected into this processor. It contains
        // the `user` instance for whom the processor is running.
        @Inject(REQUEST)
        private readonly request: MetadataManagerRequest,
        @InjectWinston()
        private readonly winstonLogger: WinstonLogger,
    ) {}

    // Register event listeners for this processor instance.
    // This lets every user have their own isolated event handling logic.
    async initialize() {
        this.winstonLogger.info(
            WinstonLog.ExecutorManagerInitialized, 
            {
                executorId: this.request.executorId,
            }
        )
    }
}

export interface MetadataManagerRequest {
    executorId: string
}