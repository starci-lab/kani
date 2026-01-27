import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./dynamic.module-definition"
import {
    DynamicGateway 
} from "./dynamic.gateway"
@Module({
    providers: [
        DynamicGateway,
    ],
})
export class DynamicModule extends ConfigurableModuleClass {}