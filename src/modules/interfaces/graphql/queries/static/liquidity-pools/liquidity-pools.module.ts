import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./liquidity-pools.module-definition"
import {
    LiquidityPoolsService 
} from "./liquidity-pools.service"
import {
    LiquidityPoolsResolver 
} from "./liquidity-pools.resolver"
import {
    PaginateService, ValidateService 
} from "../../../services"

@Module({
    providers: [
        LiquidityPoolsService,
        LiquidityPoolsResolver,
        ValidateService,
        PaginateService,
    ],
})
export class LiquidityPoolsModule extends ConfigurableModuleClass {}

