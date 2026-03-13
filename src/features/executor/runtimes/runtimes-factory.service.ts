import {
    Injectable, OnApplicationBootstrap, OnApplicationShutdown 
} from "@nestjs/common"
import {
    ContextIdFactory, ModuleRef 
} from "@nestjs/core"
import {
    AsyncService 
} from "@modules/mixin"
import {
    BotsLoaderService 
} from "../loaders"
import {
    EventName, ExecutorBotCreatedEventPayload, ExecutorBotDeletedEventPayload 
} from "@modules/event"
import {
    OnEvent 
} from "@nestjs/event-emitter"
import type {
    RuntimeContext,
} from "./types"
import {
    RuntimeContextService,
} from "./runtime.context-service"

/**
 * Factory service responsible for creating and managing runtime instances for executors.
 * 
 * This service creates isolated request-scoped contexts for each executor, allowing
 * each executor to have its own independent runtime environment. When an executor is
 * created or detected, this factory creates a new runtime context for it.
 */
@Injectable()
export class RuntimesFactoryService implements OnApplicationBootstrap, OnApplicationShutdown {
    private readonly runtimes: Map<string, RuntimeContextService> = new Map()
    constructor(
        private readonly moduleRef: ModuleRef,
        private readonly asyncService: AsyncService,
        private readonly botsLoaderService: BotsLoaderService,
    ) {}

    /**
     * Lifecycle hook that runs after the application has fully bootstrapped.
     * 
     * This method creates runtime instances for all executors that were loaded
     * during the module initialization phase. It ensures all runtime creations
     * complete successfully before proceeding.
     */
    async onApplicationBootstrap() {
        // Create runtime instances for all executors that were loaded from the database
        // Using allMustDone ensures all runtime creations complete successfully
        this.asyncService.allMustDone(
            Array.from(this.botsLoaderService.botMap.values()).map(
                async (bot) => {
                    await this.createRuntime(bot)
                }
            )
        )
    }

    async onApplicationShutdown() {
        this.asyncService.allMustDone(
            Array.from(this.runtimes.values()).map(
                async (runtime) => {
                    await runtime.dispose()
                }
            )
        )
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
        await this.asyncService.allMustDone(
            [
                (async () => {
                // Create a unique context ID for this bot's runtime
                    const contextId = ContextIdFactory.create()
                    // Register a request-scoped context with the bot ID
                    // This allows request-scoped services to access the bot ID
                    this.moduleRef.registerRequestByContextId<RuntimeContext>(
                        {
                            id: event.id 
                        }, 
                        contextId
                    )
                    // Resolve the RuntimeRequestService within the bot's context
                    // This ensures the service is scoped to this specific bot
                    const runtimeContextService = await this.moduleRef.resolve(
                        RuntimeContextService, 
                        contextId
                    )
                    // Initialize the runtime service for this bot
                    await runtimeContextService.initialize()
                    this.runtimes.set(
                        event.id, 
                        runtimeContextService
                    )
                })(),
            ])
    }

    @OnEvent(
        EventName.ExecutorBotDeleted
    )
    async handleBotDeleted(
        event: ExecutorBotDeletedEventPayload
    ) {
        const runtime = this.runtimes.get(event.id)
        if (!runtime) {
            return
        }
        // dispose & destroy the runtime
        await runtime.dispose()
        // delete the runtime from the map
        this.runtimes.delete(event.id)
    }

}   