import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./bot.module-definition"
import {
    CreateBotModule 
} from "./create-bot"
import {
    CreateBotV2Module 
} from "./create-bot-v2"
import {
    ToggleBotModule 
} from "./toggle-bot"
import {
    ToggleBotV2Module 
} from "./toggle-bot-v2"
import {
    UpdateBotLiquidityPoolsV2Module 
} from "./update-bot-liquidity-pools-v2"
import {
    UpdateBotSettingsV2Module 
} from "./update-bot-settings-v2"
import {
    UpdateBotPerformanceDisplayModeV2Module 
} from "./update-bot-performance-display-mode-v2"
import {
    UpdateBotPositionsPerformanceDisplayModeV2Module 
} from "./update-bot-positions-performance-display-mode-v2"
import {
    UpdateBotChartConfigV2Module 
} from "./update-bot-chart-config-v2"
import {
    WithdrawModule 
} from "./withdraw"

@Module({
    imports: [
        ToggleBotModule.register({
            isGlobal: true,
        }),
        ToggleBotV2Module.register({
            isGlobal: true,
        }),
        CreateBotModule.register({
            isGlobal: true,
        }),
        CreateBotV2Module.register({
            isGlobal: true,
        }),
        UpdateBotLiquidityPoolsV2Module.register({
            isGlobal: true,
        }),
        UpdateBotSettingsV2Module.register({
            isGlobal: true,
        }),
        UpdateBotPerformanceDisplayModeV2Module.register({
            isGlobal: true,
        }),
        UpdateBotPositionsPerformanceDisplayModeV2Module.register({
            isGlobal: true,
        }),
        UpdateBotChartConfigV2Module.register({
            isGlobal: true,
        }),
        WithdrawModule.register({
            isGlobal: true,
        }),
    ],
})
export class BotModule extends ConfigurableModuleClass {}