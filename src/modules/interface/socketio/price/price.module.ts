import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./price.module-definition"
import {
    PriceGateway 
} from "./price.gateway"
@Module({
    providers: [
        PriceGateway,
    ],
})
export class PriceModule extends ConfigurableModuleClass {}