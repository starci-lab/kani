import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import { ContextIdFactory, ModuleRef } from "@nestjs/core"
import { 
    BalanceProcessorRequest, 
    BalanceProcessorService, 
    ClosePositionProcessorRequest,
    ClosePositionProcessorService, 
    DistributorProcessorRequest, 
    DistributorProcessorService,
    OpenPositionProcessorService
} from "./actions"
import { OpenPositionProcessorRequest } from "./actions"
import { BotsLoaderService } from "../loaders"
import { AsyncService } from "@modules/mixin"
import { ActiveBotProcessorRequest, ActiveBotProcessorService } from "./actions/active-bot.service"

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
            this.botsLoaderService.botIds.map(async (botId) => {
                await this.resolveProcessor(botId)
            }))
    }

    async resolveProcessor(botId: string) {
        await this.asyncService.allMustDone([
            (async () => {
                const contextId = ContextIdFactory.create()
                this.moduleRef.registerRequestByContextId<ActiveBotProcessorRequest>(
                    { botId }, 
                    contextId
                )
                const activeBotProcessor = await this.moduleRef.resolve(
                    ActiveBotProcessorService, 
                    contextId
                )
                await activeBotProcessor.initialize()
            })(),
            (async () => {
                const contextId = ContextIdFactory.create()
                this.moduleRef.registerRequestByContextId<OpenPositionProcessorRequest>(
                    { botId }, 
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
                this.moduleRef.registerRequestByContextId<DistributorProcessorRequest>(
                    { botId }, 
                    contextId
                )
                const distributorProcessor = await this.moduleRef.resolve(
                    DistributorProcessorService, 
                    contextId
                )
                await distributorProcessor.initialize()
            })(),
            (async () => {
                const contextId = ContextIdFactory.create()
                this.moduleRef.registerRequestByContextId<ClosePositionProcessorRequest>(
                    { botId }, 
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
                    { botId }, 
                    contextId
                )
                const balanceProcessor = await this.moduleRef.resolve(
                    BalanceProcessorService, 
                    contextId
                )
                await balanceProcessor.initialize()
            })(),
        ])
    }
}   