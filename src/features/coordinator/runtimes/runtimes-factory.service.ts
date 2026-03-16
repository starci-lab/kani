import {
    Injectable,
    OnApplicationBootstrap,
} from "@nestjs/common"
import {
    AsyncService,
} from "@modules/mixin"
import {
    ExecutorsLoaderService,
} from "../loaders"
import type {
    CreateRuntimeParams,
    CreateRuntimeResult,
} from "../types"
import {
    CoordinatorExecutorCreatedEventPayload,
    EventName,
    CoordinatorExecutorDeletedEventPayload,
} from "@modules/event"
import {
    OnEvent,
} from "@nestjs/event-emitter"
import {
    RuntimeContextService,
} from "./runtime-context.service"

/**
 * Factory service responsible for creating and managing runtime instances for executors.
 *
 * Uses a singleton RuntimeContextService and calls initialize(id) / dispose(id) per executor.
 */
@Injectable()
export class RuntimesFactoryService implements OnApplicationBootstrap {
    constructor(
        private readonly runtimeContextService: RuntimeContextService,
        private readonly asyncService: AsyncService,
        private readonly executorsLoaderService: ExecutorsLoaderService,
    ) {}

    /**
     * Lifecycle hook that runs after the application has fully bootstrapped.
     */
    async onApplicationBootstrap() {
        // create the runtime instances for all executors
        for (const executor of this.executorsLoaderService.executorMap.values()) {
            // initialize the runtime instance for the executor
            this.runtimeContextService.initialize(executor.id)
        }
    }

    /**
     * Event handler that responds to executor creation events.
     */
    @OnEvent(EventName.CoordinatorExecutorCreated)
    async handleCoordinatorExecutorCreated(
        payload: CoordinatorExecutorCreatedEventPayload
    ): Promise<void> {
        await this.createRuntime({
            executor: payload,
        })
    }

    /**
     * Creates a new runtime instance for a given executor.
     */
    async createRuntime(
        { executor }: CreateRuntimeParams
    ): Promise<CreateRuntimeResult> {
        const id = executor.id?.toString() ?? ""
        this.runtimeContextService.initialize(id)
    }

    @OnEvent(EventName.CoordinatorExecutorDeleted)
    async handleExecutorDeleted(
        { id }: CoordinatorExecutorDeletedEventPayload
    ): Promise<void> {
        this.runtimeContextService.dispose(
            id,
            {
                withDestroy: true,
            }
        )
    }
}
