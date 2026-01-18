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
    ClmmRewardsFormulaService 
} from "./clmm-rewards.service"
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
@Module({
    providers: [
        ClmmTickFormulaService,
        DlmmBinFormulaService,
        ClmmRewardsFormulaService,
        ClmmFeesFormulaService,
        ClmmReservesFormulaService,
        ClmmUtilsService,
        ClmmLiquidityFormulaService,
    ],
    exports: [
        ClmmTickFormulaService,
        DlmmBinFormulaService,
        ClmmRewardsFormulaService,
        ClmmFeesFormulaService,
        ClmmReservesFormulaService,
        ClmmUtilsService,
        ClmmLiquidityFormulaService,
    ],
})
export class FormulasModule extends ConfigurableModuleClass {}
