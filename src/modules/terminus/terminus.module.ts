import {
    Module 
} from "@nestjs/common"
import {
    TerminusModule as NestTerminusModule 
} from "@nestjs/terminus"
import {
    ConfigurableModuleClass 
} from "./terminus.module-definition"
import {
    TerminusController 
} from "./terminus.controller"
import { 
    DependenciesService, 
    KafkaService, 
    MongodbService, 
    RedisService,
    DiskService,
    MemoryService
} from "./dependencies"

/**
 * The module for the Terminus.
 */
@Module({
    imports: [
        NestTerminusModule.forRoot({
            gracefulShutdownTimeoutMs: 1000,
            logger: false,
        })
    ],
    controllers: [TerminusController],
    providers: [
        KafkaService,
        MongodbService,
        RedisService,
        DiskService,
        MemoryService,
        DependenciesService
    ],
})
export class TerminusModule extends ConfigurableModuleClass {}