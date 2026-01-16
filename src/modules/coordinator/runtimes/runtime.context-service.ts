import { ExecutorSchema, InjectPrimaryMongoose } from "@modules/databases"
import { envConfig } from "@modules/env"
import { CoordinatorExecutorUpdatedEvent, createEventName, EventName } from "@modules/event"
import { Injectable, Scope, Inject } from "@nestjs/common"
import { REQUEST } from "@nestjs/core"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { Connection } from "mongoose"
import { K8SDeploymentService, K8SServiceService, K8SAnnotationKey } from "../bussiness"
import { AsyncService, RetryService } from "@modules/mixin"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"

@Injectable(
    {
        scope: Scope.REQUEST,
        durable: true,
    }
)
export class RuntimeContextService {
    /**
     * Cached executor state for the current request lifecycle.
     *
     * This value is refreshed either from the database or from the
     * `CoordinatorExecutorUpdatedEvent` payload.
     */
    private executor: ExecutorSchema | null = null

    constructor(
        @Inject(REQUEST)
        private readonly context: RuntimeContext,
        private readonly k8sDeploymentService: K8SDeploymentService,
        private readonly k8sServiceService: K8SServiceService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly eventEmitter2: EventEmitter2,
        private readonly asyncService: AsyncService,
        private readonly retryService: RetryService,
        @InjectWinston()
        private readonly logger: WinstonLogger,
    ) { }

    private readonly executorUpdatedHandler = (
        event: CoordinatorExecutorUpdatedEvent,
    ) => {
        this.refreshExecutor(event)
    }

    /**
     * Update the cached executor state.
     *
     * - If an event is provided, use the executor from the event.
     * - Otherwise, fetch the executor from the database.
     */
    private async refreshExecutor(
        event?: CoordinatorExecutorUpdatedEvent,
    ) {
        if (event) {
            this.executor = event.executor
        } else {
            const executor = await this.connection
                .model<ExecutorSchema>(ExecutorSchema.name)
                .findById(this.context.id)

            if (!executor) {
                return
            }
            this.executor = executor.toJSON()
        }
        // reconcile the deployment and service
        await this.asyncService.allMustDone(
            [
                this.reconcileDeployment(),
                this.reconcileService(),
            ]
        )
    }

    /**
     * Initialize the runtime request lifecycle.
     *
     * - Subscribes to executor update events
     * - Loads the initial executor state
     */
    async initialize() {
        await this.retryService.retry(
            {
                // set the maximum retry time to infinity
                options: {
                    maxRetryTime: Infinity,
                    onFailedAttempt: (context) => {
                        this.logger.error(
                            WinstonLog.RuntimeInitializationFailed, 
                            { 
                                error: context.error.message, 
                                executorId: this.context.id 
                            }
                        )
                    },
                },
                // set the action to initialize the runtime
                action: async () => {
                    // subscribe to executor updated events
                    this.eventEmitter2.on(
                        createEventName(
                            EventName.CoordinatorExecutorUpdated,
                            {
                                id: this.context.id
                            }
                        ),
                        this.executorUpdatedHandler,
                    )
                    // load the initial executor state
                    await this.refreshExecutor()
                    // reconcile the deployment and service
                    await this.asyncService.allMustDone(
                        [
                            this.reconcileDeployment(),
                            this.reconcileService(),
                        ]
                    )
                }
            }
        )
    }

    /**
     * Reconcile the Kubernetes Deployment for the executor.
     *
     * Behavior:
     * - Create the Deployment if it does not exist
     * - Recreate the Deployment if annotations are missing or version annotations mismatch
     * - Otherwise patch the Deployment to trigger a rollout (updates the pod template annotation)
     *
     * This ensures the running Deployment is aligned with:
     * - executor version (`K8SAnnotationKey.ExecutorVersion`)
     * - coordinator version (`K8SAnnotationKey.CoordinatorVersion`)
     */
    private async reconcileDeployment() {
        if (!this.executor) {
            return
        }

        const deployment = await this.k8sDeploymentService.getDeployment(
            this.executor,
        )

        if (!deployment) {
            await this.k8sDeploymentService.createDeployment(this.executor)
            return
        }

        const annotations = deployment.metadata?.annotations
        if (!annotations) {
            await this.k8sDeploymentService.deleteDeployment(this.executor.id)
            await this.k8sDeploymentService.createDeployment(this.executor)
            return
        }
        const executorVersion =
            annotations[K8SAnnotationKey.ExecutorVersion]
        const coordinatorVersion =
            annotations[K8SAnnotationKey.CoordinatorVersion]
        // if the executor version or coordinator version is not the same as the cached executor, delete the deployment and create a new one
        if (
            executorVersion !== this.executor.version ||
            coordinatorVersion !== envConfig().version.coordinator
        ) {
            await this.k8sDeploymentService.deleteDeployment(this.executor.id)
            await this.k8sDeploymentService.createDeployment(this.executor)
        }
    }

    /**
     * Reconcile the Kubernetes Service for the executor.
     *
     * Behavior:
     * - Create the Service if it does not exist
     * - Recreate the Service if annotations are missing or version annotations mismatch
     * - Otherwise do nothing (Service selectors and ports are already correct)
     */
    private async reconcileService() {
        if (!this.executor) {
            return
        }

        const service = await this.k8sServiceService.getService(this.executor)

        if (!service) {
            await this.k8sServiceService.createService(this.executor)
            return
        }

        const annotations = service.metadata?.annotations
        if (!annotations) {
            await this.k8sServiceService.deleteService(this.executor.id)
            await this.k8sServiceService.createService(this.executor)
            return
        }

        const executorVersion =
            annotations[K8SAnnotationKey.ExecutorVersion]
        const coordinatorVersion =
            annotations[K8SAnnotationKey.CoordinatorVersion]

        if (
            executorVersion !== this.executor.version ||
            coordinatorVersion !== envConfig().version.coordinator
        ) {
            await this.k8sServiceService.deleteService(this.executor.id)
            await this.k8sServiceService.createService(this.executor)
        }
    }

    /**
     * Dispose the runtime request lifecycle.
     *
     * Called when the request scope is destroyed.
     */
    async dispose(withDestroy: boolean = false) {
        if (!this.executor) {
            return
        }
        // unsubscribe from the executor updated event
        this.eventEmitter2.off(
            createEventName(
                EventName.CoordinatorExecutorUpdated,
                {
                    id: this.context.id
                }
            ),
            this.executorUpdatedHandler,
        )
        if (withDestroy) {
            await this.destroy()
        }
        // clear the cached executor
        this.executor = null
    }

    private async destroy() {
        if (!this.executor) {
            return
        }
        // destroy the deployment and service
        await this.asyncService.allMustDone(
            [
                this.k8sDeploymentService.deleteDeployment(this.executor.id),
                this.k8sServiceService.deleteService(this.executor.id),
            ]
        )
    }
}


export interface RuntimeContext {
    id: string
}