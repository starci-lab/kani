import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import { ContextIdFactory, ModuleRef } from "@nestjs/core"
import { BotSchema } from "@modules/databases"
import { OpenPositionProcessorService } from "./positions"
import { OpenPositionProcessorRequest } from "./positions"
import { BotsLoaderService } from "../loaders"

@Injectable()
export class ProcessorFactoryService implements OnApplicationBootstrap {
    constructor(
        private readonly moduleRef: ModuleRef,
        private readonly botsLoaderService: BotsLoaderService,
    ) {}

    async onApplicationBootstrap() {
        // resolve all processors
        await Promise.all(
            this.botsLoaderService.bots.map(async (bot) => {
                await this.resolveProcessor(bot)
            }))
    }

    async resolveProcessor(bot: BotSchema) {
        const contextId = ContextIdFactory.create()
        this.moduleRef.registerRequestByContextId<OpenPositionProcessorRequest>(
            { bot }, 
            contextId
        )
        // create a open position processor instance
        const openPositionProcessor = await this.moduleRef.resolve(
            OpenPositionProcessorService, 
            contextId
        )
        // initialize the open position processor
        openPositionProcessor.initialize()
    }
}   