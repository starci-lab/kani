import {
    Module
} from "@nestjs/common"
import {
    ConfigurableModuleClass
} from "./loggers.module-definition"
import {
    DebugFileLoggerService
} from "./file.service"

@Module({
    providers: [
        DebugFileLoggerService,
    ],
    exports: [
        DebugFileLoggerService,
    ],
})
export class DebugLoggersModule extends ConfigurableModuleClass {}
