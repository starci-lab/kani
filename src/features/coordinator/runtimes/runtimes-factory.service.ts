import {
    Injectable,
    OnApplicationBootstrap,
    OnApplicationShutdown,
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
export class RuntimesFactoryService implements OnApplicationBootstrap, OnApplicationShutdown {
    private readonly runtimes: Map<string, RuntimeContextService> = new Map()

    constructor(
        private readonly runtimeContextService: RuntimeContextService,
        private readonly asyncService: AsyncService,
        private readonly executorsLoaderService: ExecutorsLoaderService,
    ) {}

    /**
     * Lifecycle hook that runs after the application has fully bootstrapped.
     */
    async onApplicationBootstrap() {
        this.asyncService.allMustDone(
            Array.from(this.executorsLoaderService.executorMap.values()).map(
                async (executor) => {
                    await this.createRuntime({
                        executor,
                    })
                }
            )
        )
    }

    async onApplicationShutdown() {
        const ids = Array.from(this.runtimes.keys())
        for (const id of ids) {
            await this.runtimeContextService.dispose(id,
                {
                    withDestroy: true,
                },
            )
            this.runtimes.delete(id)
        }
    }

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
        await this.asyncService.allMustDone([
            (async () => {
                await this.runtimeContextService.initialize(id)
                this.runtimes.set(id,
                    this.runtimeContextService,
                )
            })(),
        ])
    }

    @OnEvent(EventName.CoordinatorExecutorDeleted)
    async handleExecutorDeleted(
        { id }: CoordinatorExecutorDeletedEventPayload
    ): Promise<void> {
        const runtime = this.runtimes.get(id)
        if (!runtime) {
            return
        }
        await runtime.dispose(id,
            {
                withDestroy: true,
            },
        )
        this.runtimes.delete(id)
    }
}
