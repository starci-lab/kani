import { Module } from "@nestjs/common"
import { LiquidityProvisionBotResolver } from "./liquidity-provision-bot.resolvers"
import { LiquidityProvisionBotService } from "./liquidity-provision-bot.service"
import { ConfigurableModuleClass } from "./liquidity-provision-bot.module-definition"

@Module({
    providers: [LiquidityProvisionBotResolver, LiquidityProvisionBotService],
})
export class LiquidityProvisionBotModule extends ConfigurableModuleClass {}