import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./update-bot-liquidity-pools-v2.module-definition"
import {
    UpdateBotLiquidityPoolsV2Resolver 
} from "./update-bot-liquidity-pools-v2.resolver"
import {
    UpdateBotLiquidityPoolsV2Service 
} from "./update-bot-liquidity-pools-v2.service"

@Module({
    providers: [
        UpdateBotLiquidityPoolsV2Service,
        UpdateBotLiquidityPoolsV2Resolver,
    ],
})
export class UpdateBotLiquidityPoolsV2Module extends ConfigurableModuleClass {}


