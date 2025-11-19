
import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./balance.module-definition"
import { SolanaBalanceService } from "./solana.service"
import { BalanceService } from "./balance.service"

@Module({
    providers: [
        SolanaBalanceService, 
        BalanceService
    ],
    exports: [BalanceService],
})
export class BalancesModule extends ConfigurableModuleClass {}
