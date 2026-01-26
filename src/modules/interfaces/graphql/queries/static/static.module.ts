import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./static.module-definition"
import {
    TokensModule 
} from "./tokens"
import {
    LiquidityPoolsModule 
} from "./liquidity-pools"
import {
    DexesModule 
} from "./dexes"
import {
    AccountLimitsModule 
} from "./account-limits"
import {
    GasConfigModule 
} from "./gas-config"
import {
    BalanceConfigModule 
} from "./balance-config"

@Module({
    imports: [
        TokensModule.register({
            isGlobal: true,
        }),
        LiquidityPoolsModule.register({
            isGlobal: true,
        }),
        DexesModule.register({
            isGlobal: true,
        }),
        AccountLimitsModule.register({
            isGlobal: true,
        }),
        GasConfigModule.register({
            isGlobal: true,
        }),
        BalanceConfigModule.register({
            isGlobal: true,
        }),
    ],
})
export class StaticModule extends ConfigurableModuleClass {}