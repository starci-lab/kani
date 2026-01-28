import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./positions-v2.module-definition"
import {
    PositionsV2Service 
} from "./positions-v2.service"
import {
    PositionsV2Resolver 
} from "./positions-v2.resolver"
import {
    ValidateService 
} from "../../../services"

@Module({
    providers: [
        PositionsV2Service,
        PositionsV2Resolver,
        ValidateService,
    ],
})
export class PositionsV2Module extends ConfigurableModuleClass {}

