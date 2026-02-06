import {
    Module,
} from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./bots.module-definition"
import {
    BotModule,
} from "./bot"
import {
    BotV2Module,
} from "./bot-v2"
import {
    BalancesV2Module,
} from "./balances-v2"
import {
    BotsModule as BotsCursorModule,
} from "./bots"
import {
    BotsV2Module,
} from "./bots-v2"
import {
    BotsModule as BotsQueryModule,
} from "./bots"
import {
    ReservesWithFeesModule,
} from "./reserves-with-fees"
import {
    ReservesWithFeesV2Module,
} from "./reserves-with-fees-v2"
import {
    PortfolioValueV2Module,
} from "./portfolio-value-v2"

@Module({
    imports: [
        BotModule.register({
            isGlobal: true,
        }),
        BotV2Module.register({
            isGlobal: true,
        }),
        BalancesV2Module.register({
            isGlobal: true,
        }),
        BotsCursorModule.register({
            isGlobal: true,
        }),
        BotsV2Module.register({
            isGlobal: true,
        }),
        BotsQueryModule.register({
            isGlobal: true,
        }),
        BotsV2Module.register({
            isGlobal: true,
        }),
        ReservesWithFeesModule.register({
            isGlobal: true,
        }),
        ReservesWithFeesV2Module.register({
            isGlobal: true,
        }),
        PortfolioValueV2Module.register({
            isGlobal: true,
        }),
    ],
})
export class BotsModule extends ConfigurableModuleClass {}