import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./price-feeds.module-definition"
import {
    CoingeckoModule 
} from "./coingecko"
import {
    CoinMarketCapModule 
} from "./coinmarketcap"
import {
    PythModule 
} from "./pyth"
 
@Module({
    imports: [
        CoingeckoModule.register({
            isGlobal: true,
        }),
        CoinMarketCapModule.register({
            isGlobal: true,
        }),
        PythModule.register({
            isGlobal: true,
        }),
    ],
})
export class PriceFeedsModule extends ConfigurableModuleClass {}
