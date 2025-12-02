import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import { ContextIdFactory, ModuleRef } from "@nestjs/core"
import { BotSchema } from "@modules/databases"
import { BalanceProcessorRequest, BalanceProcessorService, ClosePositionProcessorRequest, ClosePositionProcessorService, DistributorProcessorRequest, DistributorProcessorService, OpenPositionProcessorService } from "./actions"
import { OpenPositionProcessorRequest } from "./actions"
import { BotsLoaderService } from "../loaders"
import { AsyncService } from "@modules/mixin"

@Injectable()
export class ProcessorFactoryService implements OnApplicationBootstrap {
    constructor(
        private readonly moduleRef: ModuleRef,
        private readonly botsLoaderService: BotsLoaderService,
        private readonly asyncService: AsyncService,
    ) {}

    async onApplicationBootstrap() {
        // resolve all processors
        await this.asyncService.allMustDone(
            this.botsLoaderService.bots.map(async (bot) => {
                await this.resolveProcessor(bot)
            }))
    }

    async resolveProcessor(bot: BotSchema) {
        await this.asyncService.allMustDone([
            (async () => {
                const contextId = ContextIdFactory.create()
                this.moduleRef.registerRequestByContextId<OpenPositionProcessorRequest>(
                    { bot }, 
                    contextId
                )
                const openPositionProcessor = await this.moduleRef.resolve(
                    OpenPositionProcessorService, 
                    contextId
                )
                await openPositionProcessor.initialize()
            })(),
            (async () => {
                const contextId = ContextIdFactory.create()
                this.moduleRef.registerRequestByContextId<ClosePositionProcessorRequest>(
                    { bot }, 
                    contextId
                )
                const closePositionProcessor = await this.moduleRef.resolve(
                    ClosePositionProcessorService, 
                    contextId
                )
                await closePositionProcessor.initialize()
            })(),
            (async () => {
                const contextId = ContextIdFactory.create()
                this.moduleRef.registerRequestByContextId<BalanceProcessorRequest>(
                    { bot }, 
                    contextId
                )
                const balanceProcessor = await this.moduleRef.resolve(
                    BalanceProcessorService, 
                    contextId
                )
                await balanceProcessor.initialize()
            })(),
            (async () => {
                const contextId = ContextIdFactory.create()
                this.moduleRef.registerRequestByContextId<DistributorProcessorRequest>(
                    { bot }, 
                    contextId
                )
                const distributorProcessor = await this.moduleRef.resolve(
                    DistributorProcessorService, 
                    contextId
                )
                await distributorProcessor.initialize()
            })(),
        ])
    }
}   