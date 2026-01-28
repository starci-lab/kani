import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./formulas.module-definition"
import {
    ClmmTickFormulaService 
} from "./clmm-tick.service"
import {
    DlmmBinFormulaService 
} from "./dlmm-bin.service"
import {
    ClmmUtilsService 
} from "./clmm-utils.service"
import {
    ClmmFeesFormulaService 
} from "./clmm-fees.service"
import {
    ClmmReservesFormulaService 
} from "./clmm-reserves.service"
import {
    ClmmLiquidityFormulaService 
} from "./clmm-liquidity.service"
import {
    ClmmRewardsFormulaService 
} from "./clmm-rewards.service"

@Module({
    providers: [
        ClmmTickFormulaService,
        DlmmBinFormulaService,
        ClmmFeesFormulaService,
        ClmmReservesFormulaService,
        ClmmUtilsService,
        ClmmLiquidityFormulaService,
        ClmmRewardsFormulaService,
    ],
    exports: [
        ClmmTickFormulaService,
        DlmmBinFormulaService,
        ClmmFeesFormulaService,
        ClmmReservesFormulaService,
        ClmmUtilsService,
        ClmmLiquidityFormulaService,
        ClmmRewardsFormulaService,
    ],
})
export class FormulasModule extends ConfigurableModuleClass {}
