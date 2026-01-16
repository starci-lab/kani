import { Injectable, OnApplicationBootstrap, OnApplicationShutdown } from "@nestjs/common"
import { ContextIdFactory, ModuleRef } from "@nestjs/core"
import { AsyncService } from "@modules/mixin"
import { ExecutorsLoaderService } from "../loaders"
import { ExecutorSchema } from "@modules/databases"
import { CoordinatorExecutorCreatedEvent, EventName, CoordinatorExecutorDeletedEvent } from "@modules/event"
import { OnEvent } from "@nestjs/event-emitter"
import { RuntimeContext, RuntimeContextService } from "./runtime.context-service"

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
        private readonly executorsLoaderService: ExecutorsLoaderService,
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
            Array.from(
                this.executorsLoaderService.executors.values())
                .map(
                    async (executor) => {
                        await this.createRuntime(executor)
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
     * Event handler that responds to executor creation events.
     * 
     * When a new executor is detected (either through initial load or change stream),
     * this handler creates a new runtime instance for that executor.
     * 
     * @param payload - The event payload containing the executor ID
     */
    @OnEvent(
        EventName.CoordinatorExecutorCreated
    )
    async handleCoordinatorExecutorCreated(
        payload: CoordinatorExecutorCreatedEvent
    ) {
        await this.createRuntime({ id: payload.id })
    }
    
    /**
     * Creates a new runtime instance for a given executor.
     * 
     * This method:
     * 1. Creates a unique context ID for the executor's runtime
     * 2. Registers a request-scoped context with the executor ID
     * 3. Resolves the RuntimeRequestService within that context
     * 4. Initializes the runtime service
     * 
     * Each executor gets its own isolated context, allowing request-scoped services
     * to be executor-specific. This is useful for maintaining separate state and
     * configuration per executor.
     * 
     * @param executor - Partial executor schema containing at least the executor ID
     */
    async createRuntime(
        executor: Partial<ExecutorSchema>
    ) {
        await this.asyncService.allMustDone([
            (async () => {
                // Create a unique context ID for this executor's runtime
                const contextId = ContextIdFactory.create()
                // Register a request-scoped context with the executor ID
                // This allows request-scoped services to access the executor ID
                this.moduleRef.registerRequestByContextId<RuntimeContext>(
                    { id: executor.id?.toString() || "" }, 
                    contextId
                )
                // Resolve the RuntimeRequestService within the executor's context
                // This ensures the service is scoped to this specific executor
                const runtimeContextService = await this.moduleRef.resolve(
                    RuntimeContextService, 
                    contextId
                )
                // Initialize the runtime service for this executor
                await runtimeContextService.initialize()
                this.runtimes.set(
                    executor.id?.toString() || "", 
                    runtimeContextService
                )
            })(),
        ])
    }

    @OnEvent(
        EventName.CoordinatorExecutorDeleted
    )
    async handleExecutorDeleted(
        { id}: CoordinatorExecutorDeletedEvent
    ) {
        const runtime = this.runtimes.get(id)
        if (!runtime) {
            return
        }
        // dispose & destroy the runtime
        await runtime.dispose(true)
        // delete the runtime from the map
        this.runtimes.delete(id)
    }

}   