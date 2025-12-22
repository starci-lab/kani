import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import { ContextIdFactory, ModuleRef } from "@nestjs/core"
import { 
    DeploymentManagerRequest,
    DeploymentManagerService,
    MetadataManagerRequest,
    MetadataManagerService,
} from "./resources"
import { AsyncService } from "@modules/mixin"
import { ExecutorsLoaderService } from "../loaders"
import { ExecutorSchema } from "@modules/databases"
import { EventName, ExecutorCreatedEvent } from "@modules/event"
import { OnEvent } from "@nestjs/event-emitter"

@Injectable()
export class K8sManagerFactoryService implements OnApplicationBootstrap {
    constructor(
        private readonly moduleRef: ModuleRef,
        private readonly asyncService: AsyncService,
        private readonly executorsLoaderService: ExecutorsLoaderService,
    ) {}

    async onApplicationBootstrap() {
        // resolve all processors
        await this.asyncService.allMustDone(
            this.executorsLoaderService.executors.map(async (executor) => {
                await this.resolveK8sManager(executor)
            }))
    }
    
    @OnEvent(EventName.ExecutorCreated)
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
        ])

    }
}   