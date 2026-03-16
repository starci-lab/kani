import {
    ExecutorSchema,
    InjectPrimaryMongoose,
} from "@modules/databases"
import {
    envConfig,
} from "@modules/env"
import {
    CoordinatorExecutorUpdatedEventPayload,
    EventName,
    EventEmitterService,
} from "@modules/event"
import {
    Injectable,
} from "@nestjs/common"
import {
    Connection,
} from "mongoose"
import {
    K8SDeploymentService,
    K8SServiceService,
    K8SAnnotationKey,
} from "../bussiness"
import {
    AsyncService,
} from "@modules/mixin"
import type {
    DisposeParams,
} from "../types"
import type {
    RuntimeState,
    RuntimeListener,
} from "./types"
import {
    WinstonLog,
    WinstonService,
} from "@modules/winston"

/**
 * Service responsible for managing the runtime context for each executor.
 */
@Injectable()
export class RuntimeContextService {
    /**
     * Map of runtime states for each executor.
     */
    private readonly runtimeMap: Map<string, RuntimeState> = new Map()

    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly eventEmitterService: EventEmitterService,
        private readonly k8sDeploymentService: K8SDeploymentService,
        private readonly k8sServiceService: K8SServiceService,
        private readonly asyncService: AsyncService,
        private readonly winstonService: WinstonService,
    ) {}

    /**
     * Get the executor by id using the database connection as source of truth.
     *
     * @param id - The id of the executor to find.
     * @returns The executor, or null if not found.
     */
    async findExecutor(id: string): Promise<ExecutorSchema | null> {
        const executor = await this.connection
            .model<ExecutorSchema>(ExecutorSchema.name)
            .findById(id)

        if (!executor) {
            return null
        }

        return executor.toJSON()
    }

    /**
     * Get or create runtime state for an executor.
     *
     * @param id - The id of the executor to get or create the runtime state for.
     * @returns The runtime state.
     */
    private getOrCreateRuntimeState(id: string): RuntimeState {
        const existing = this.runtimeMap.get(id)
        if (existing) {
            return existing
        }

        const state: RuntimeState = {
            initialized: false,
            disposing: false,
            listeners: [],
            executor: null,
        }

        this.runtimeMap.set(id,
            state)
        return state
    }

    /**
     * Subscribe to an event and retain the exact listener reference for cleanup.
     *
     * @param id - The id of the executor to subscribe to the event for.
     * @param event - The event to subscribe to.
     * @param listener - The listener to subscribe to the event.
     */
    private subscribe(
        id: string,
        event: EventName,
        listener: (event: unknown) => Promise<void>,
    ): void {
        const state = this.getOrCreateRuntimeState(id)

        const runtimeListener: RuntimeListener = {
            event,
            args: [id],
            listener,
        }

        this.eventEmitterService.on(runtimeListener as never)
        state.listeners.push(runtimeListener)
    }

    /**
     * Refresh the cached executor state and reconcile K8s resources.
     *
     * @param id - The id of the executor.
     * @param event - Optional event payload to set executor from.
     */
    private async refreshExecutor(
        id: string,
        event?: CoordinatorExecutorUpdatedEventPayload,
    ): Promise<void> {
        const state = this.getOrCreateRuntimeState(id)

        if (event) {
            state.executor = event
        } else {
            const executor = await this.findExecutor(id)
            if (!executor) {
                return
            }
            state.executor = executor
        }

        await this.asyncService.allMustDone([
            this.reconcileDeployment(state.executor),
            this.reconcileService(state.executor),
        ])
    }

    /**
     * Reconcile the Kubernetes Deployment for the executor.
     */
    private async reconcileDeployment(executor: ExecutorSchema | null): Promise<void> {
        if (!executor) {
            return
        }

        const deployment = await this.k8sDeploymentService.getDeployment({
            executor,
        })

        if (!deployment) {
            await this.k8sDeploymentService.createDeployment({
                executor,
            })
            return
        }

        const annotations = deployment?.metadata?.annotations
        if (!annotations) {
            await this.k8sDeploymentService.deleteDeployment({
                executorId: executor.id,
            })
            await this.k8sDeploymentService.createDeployment({
                executor,
            })
            return
        }

        const executorVersion = annotations[K8SAnnotationKey.ExecutorVersion]
        const coordinatorVersion = annotations[K8SAnnotationKey.CoordinatorVersion]
        if (
            executorVersion !== executor.version.toString() ||
            coordinatorVersion !== envConfig().coordinator.version
        ) {
            await this.k8sDeploymentService.deleteDeployment({
                executorId: executor.id,
            })
            await this.k8sDeploymentService.createDeployment({
                executor,
            })
        }
    }

    /**
     * Reconcile the Kubernetes Service for the executor.
     */
    private async reconcileService(executor: ExecutorSchema | null): Promise<void> {
        if (!executor) {
            return
        }

        const service = await this.k8sServiceService.getService({
            executor,
        })

        if (!service) {
            await this.k8sServiceService.createService({
                executor,
            })
            return
        }

        const annotations = service.metadata?.annotations
        if (!annotations) {
            await this.k8sServiceService.deleteService({
                executorId: executor.id,
            })
            await this.k8sServiceService.createService({
                executor,
            })
            return
        }

        const executorVersion = annotations[K8SAnnotationKey.ExecutorVersion]
        const coordinatorVersion = annotations[K8SAnnotationKey.CoordinatorVersion]
        if (
            executorVersion !== executor.version.toString() ||
            coordinatorVersion !== envConfig().coordinator.version
        ) {
            await this.k8sServiceService.deleteService({
                executorId: executor.id,
            })
            await this.k8sServiceService.createService({
                executor,
            })
        }
    }

    /**
     * Initialize runtime lifecycle for an executor.
     *
     * @param id - The id of the executor to initialize the runtime lifecycle for.
     */
    initialize(id: string): void {
        const state = this.getOrCreateRuntimeState(id)

        if (state.initialized) {
            return
        }

        state.initialized = true
        state.disposing = false

        this.subscribe(
            id,
            EventName.CoordinatorExecutorUpdated,
            async (event: CoordinatorExecutorUpdatedEventPayload) => {
                await this.asyncService.safeRun(async () => {
                    await this.refreshExecutor(id,
                        event,
                    )
                })
            },
        )

        this.refreshExecutor(id)

        this.winstonService.log(
            WinstonLog.ExecutorRuntimeInitialized,
            {
                id,
            }
        )
    }

    /**
     * Dispose runtime lifecycle for an executor.
     *
     * @param id - The id of the executor to dispose the runtime lifecycle for.
     * @param params - Optional params (e.g. withDestroy to delete K8s resources).
     */
    dispose(
        id: string,
        { withDestroy = false }: DisposeParams = {
        },
    ): void {
        const state = this.runtimeMap.get(id)
        if (!state || state.disposing) {
            return
        }

        state.disposing = true

        for (const runtimeListener of state.listeners) {
            this.eventEmitterService.off({
                event: runtimeListener.event,
                args: runtimeListener.args,
                listener: runtimeListener.listener,
            } as never)
        }
        state.listeners.length = 0

        if (withDestroy && state.executor) {
            this.asyncService.allMustDone([
                this.k8sDeploymentService.deleteDeployment({
                    executorId: state.executor.id,
                }),
                this.k8sServiceService.deleteService({
                    executorId: state.executor.id,
                }),
            ])
        }

        state.executor = null
        state.initialized = false
        state.disposing = false

        this.runtimeMap.delete(id)
    }
}
