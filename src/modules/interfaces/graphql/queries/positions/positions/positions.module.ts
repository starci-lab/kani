import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./positions.module-definition"
import {
    PositionsService 
} from "./positions.service"
import {
    PositionsResolver 
} from "./positions.resolver"
import {
    ValidateService 
} from "../../../services"

@Module({
    providers: [
        PositionsService,
        PositionsResolver,
        ValidateService,
    ],
})
export class PositionsV1Module extends ConfigurableModuleClass {}

