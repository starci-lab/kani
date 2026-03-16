import {
    Injectable, OnApplicationBootstrap 
} from "@nestjs/common"
import {
    BotsLoaderService 
} from "../loaders"
import {
    EventName, ExecutorBotCreatedEventPayload, ExecutorBotDeletedEventPayload 
} from "@modules/event"
import {
    OnEvent 
} from "@nestjs/event-emitter"
import {
    RuntimeContextService,
} from "./runtime-context.service"
import {
    envConfig 
} from "@modules/env"
import {
    sleep 
} from "@modules/common"

/**
 * Factory service responsible for creating and managing runtime instances for executors.
 * 
 * This service creates isolated request-scoped contexts for each executor, allowing
 * each executor to have its own independent runtime environment. When an executor is
 * created or detected, this factory creates a new runtime context for it.
 */
@Injectable()
export class RuntimesFactoryService implements OnApplicationBootstrap {
    constructor(
        private readonly botsLoaderService: BotsLoaderService,
        private readonly runtimeContextService: RuntimeContextService,
    ) {}

    /**
     * Lifecycle hook that runs after the application has fully bootstrapped.
     * 
     * This method creates runtime instances for all executors that were loaded
     * during the module initialization phase. It ensures all runtime creations
     * complete successfully before proceeding.
     */
    async onApplicationBootstrap() {
        // bootstrap the runtime instances for all executors
        const bootstrapMs = envConfig().executor.runtime.bootstrapMs
        // get the number of bots
        const numberOfBots = this.botsLoaderService.botMap.size
        // calculate the bootstrap time
        const bootstrapTime = bootstrapMs / numberOfBots
        // create the runtime instances for all executors
        for (const bot of this.botsLoaderService.botMap.values()) {
            // initialize the runtime instance for the bot
            this.runtimeContextService.initialize(bot.id)
            // sleep for the bootstrap time
            await sleep(bootstrapTime)
        }
    }

    /**
     * Event handler that responds to bot creation events.
     * 
     * When a new bot is detected (either through initial load or change stream),
     * this handler creates a new runtime instance for that bot.
     * 
     * @param event - The event payload containing the bot ID
     */
    @OnEvent(
        EventName.ExecutorBotCreated
    )
    async handleBotCreated(
        event: ExecutorBotCreatedEventPayload
    ) {
        await this.createRuntime(event)
    }
    
    /**
     * Creates a new runtime instance for a given executor.
     * 
     * This method:
     * 1. Creates a unique context ID for the bot's runtime
     * 2. Registers a request-scoped context with the bot ID
     * 3. Resolves the RuntimeRequestService within that context
     * 4. Initializes the runtime service
     * 
     * Each bot gets its own isolated context, allowing request-scoped services
     * to be bot-specific. This is useful for maintaining separate state and
     * configuration per executor.
     * 
     * @param event - The event payload containing the bot ID
     */
    async createRuntime(
        event: ExecutorBotCreatedEventPayload
    ) {
        this.runtimeContextService.initialize(event.id)
    }

    @OnEvent(
        EventName.ExecutorBotDeleted
    )
    async handleBotDeleted(
        event: ExecutorBotDeletedEventPayload
    ) {
        await this.runtimeContextService.dispose(event.id)
    }

}   