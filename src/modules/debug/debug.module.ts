import {
    Module
} from "@nestjs/common"
import {
    ConfigurableModuleClass
} from "./debug.module-definition"
import {
    DebugLatencyService
} from "./latency.service"
@Module({
    providers: [
        DebugLatencyService,
    ],
    exports: [
        DebugLatencyService,
    ],
})
export class DebugModule extends ConfigurableModuleClass {}
