import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import { ContextIdFactory, ModuleRef } from "@nestjs/core"
import { 
    DeploymentManagerRequest,
    DeploymentManagerService,
    ServiceManagerRequest,
    ServiceManagerService,
} from "./resources"
import { AsyncService } from "@modules/mixin"
import { ExecutorsLoaderService } from "../loaders"
import { ExecutorSchema } from "@modules/databases"
import { EventName, ExecutorCreatedEvent } from "@modules/event"
import { OnEvent } from "@nestjs/event-emitter"
import { MetadataManagerRequest, MetadataManagerService } from "./metadata"

@Injectable()
export class K8sManagerFactoryService implements OnApplicationBootstrap {
    constructor(
        private readonly moduleRef: ModuleRef,
        private readonly asyncService: AsyncService,
        private readonly executorsLoaderService: ExecutorsLoaderService,
    ) {}

    onApplicationBootstrap() {
        // resolve all processors
        this.asyncService.allMustDone(
            this.executorsLoaderService.executors.map(async (executor) => {
                await this.resolveK8sManager(executor)
            }
            )
        )
    }

    @OnEvent(
        EventName.ExecutorDeleted
    )
    async handleExecutorDeleted(
        payload: ExecutorDeletedEvent
    ) {
        await this.resolveK8sManager({ id: payload.id })
    }
    
    @OnEvent(
        EventName.ExecutorCreated
    )
    async handleExecutorCreated(
        payload: ExecutorCreatedEvent
    ) {
        await this.resolveK8sManager({ id: payload.id })
    }
    
    async resolveK8sManager(
        executor: Partial<ExecutorSchema>
    ) {
        await this.asyncService.allMustDone([
            (async () => {
                const contextId = ContextIdFactory.create()
                this.moduleRef.registerRequestByContextId<DeploymentManagerRequest>(
                    { executorId: executor.id?.toString() || "" }, 
                    contextId
                )
                const deploymentManager = await this.moduleRef.resolve(
                    DeploymentManagerService, 
                    contextId
                )
                await deploymentManager.initialize()
            })(),
            (async () => {
                const contextId = ContextIdFactory.create()
                this.moduleRef.registerRequestByContextId<MetadataManagerRequest>(
                    { executorId: executor.id?.toString() || "" }, 
                    contextId
                )
                const metadataManager = await this.moduleRef.resolve(
                    MetadataManagerService, 
                    contextId
                )
                await metadataManager.initialize()
            })(),
            (async () => {
                const contextId = ContextIdFactory.create()
                this.moduleRef.registerRequestByContextId<ServiceManagerRequest>(
                    { executorId: executor.id?.toString() || "" }, 
                    contextId
                )
                const serviceManager = await this.moduleRef.resolve(
                    ServiceManagerService, 
                    contextId
                )
                await serviceManager.initialize()
            })(),
        ])

    }
}   