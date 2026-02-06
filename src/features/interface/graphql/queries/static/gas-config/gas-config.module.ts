import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./gas-config.module-definition"
import {
    GasConfigService 
} from "./gas-config.service"
import {
    GasConfigResolver 
} from "./gas-config.resolver"

@Module({
    providers: [
        GasConfigService,
        GasConfigResolver,
    ],
})
export class GasConfigModule extends ConfigurableModuleClass {}

