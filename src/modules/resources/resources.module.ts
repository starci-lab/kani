import {
    Module,
} from "@nestjs/common"
import {
    RamService,
} from "./ram.service"
import {
    ConfigurableModuleClass,
} from "./resources.module-definition"

@Module({

    providers: [
        RamService, 
    ],
})
export class ResourcesModule extends ConfigurableModuleClass {}
