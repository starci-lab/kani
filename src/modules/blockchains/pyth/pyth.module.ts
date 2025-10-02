import { Module } from "@nestjs/common"
import { PythService } from "./pyth.service"
import { PythSuiService } from "./pyth-sui.service"
import { ConfigurableModuleClass } from "./pyth.module-definition"

@Module({
    providers: [
        PythService,
        PythSuiService,
    ],
    exports: [
        PythService,
        PythSuiService,
    ],
})
export class PythModule extends ConfigurableModuleClass {}