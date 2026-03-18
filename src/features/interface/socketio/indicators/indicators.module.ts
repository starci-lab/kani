import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./indicators.module-definition"
import {
    IndicatorsGateway 
} from "./indicators.gateway"

@Module({
    providers: [
        IndicatorsGateway,
    ],
})
export class IndicatorsModule extends ConfigurableModuleClass {}
