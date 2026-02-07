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
    ExecutorsLoaderService 
} from "../loaders"
import type {
    CreateRuntimeParams,
    CreateRuntimeResult
} from "../types"
import {
    CoordinatorExecutorCreatedEventPayload, EventName, CoordinatorExecutorDeletedEventPayload 
} from "@modules/event"
import {
    OnEvent 
} from "@nestjs/event-emitter"
import {
    RuntimeContext, RuntimeContextService 
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
        // create runtime instances for all executors that were loaded from the database
        // using allMustDone ensures all runtime creations complete successfully
        this.asyncService.allMustDone(
            this.executorsLoaderService.executorCollection.find().map(
                async (executor) => {
                    await this.createRuntime({
                        executor 
                    })
                }
            )
        )
    }

    async onApplicationShutdown() {
        this.asyncService.allMustDone(
            Array.from(this.runtimes.values()).map(
                async (runtime) => {
                    await runtime.dispose({
                    })
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
     * @param payload - The event payload containing executor information
     * @returns Promise that resolves when runtime is created
     *
     * @example
     * await service.handleCoordinatorExecutorCreated(payload)
     */
    @OnEvent(
        EventName.CoordinatorExecutorCreated
    )
    async handleCoordinatorExecutorCreated(
        payload: CoordinatorExecutorCreatedEventPayload
    ): Promise<void> {
        await this.createRuntime({
            executor: payload 
        })
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
     * @param param - Parameters for creating runtime
     * @returns Promise that resolves when runtime is created
     *
     * @example
     * await service.createRuntime({ executor })
     */
    async createRuntime(
        { executor }: CreateRuntimeParams
    ): Promise<CreateRuntimeResult> {
        await this.asyncService.allMustDone([
            (async () => {
                // Create a unique context ID for this executor's runtime
                const contextId = ContextIdFactory.create()
                // Register a request-scoped context with the executor ID
                // This allows request-scoped services to access the executor ID
                this.moduleRef.registerRequestByContextId<RuntimeContext>(
                    {
                        id: executor.id?.toString() || "" 
                    }, 
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

    /**
     * Event handler that responds to executor deletion events.
     *
     * When an executor is deleted, this handler disposes and destroys
     * the runtime instance for that executor.
     *
     * @param payload - The event payload containing executor ID
     * @returns Promise that resolves when runtime is disposed
     *
     * @example
     * await service.handleExecutorDeleted(payload)
     */
    @OnEvent(
        EventName.CoordinatorExecutorDeleted
    )
    async handleExecutorDeleted(
        { id }: CoordinatorExecutorDeletedEventPayload
    ): Promise<void> {
        const runtime = this.runtimes.get(id)
        if (!runtime) {
            return
        }
        // dispose & destroy the runtime
        await runtime.dispose({
            withDestroy: true 
        })
        // delete the runtime from the map
        this.runtimes.delete(id)
    }

}   