import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./formulas.module-definition"
import { ClmmTickFormulaService } from "./clmm-tick.service"
import { DlmmBinFormulaService } from "./dlmm-bin.service"
import { ClmmRewardsFormulaService } from "./clmm-rewards.service"
import { ClmmUtilsService } from "./clmm-utils.service"
import { ClmmFeesFormulaService } from "./clmm-fees.service"
import { ClmmReservesFormulaService } from "./clmm-reserves.service"
@Module({
    providers: [
        ClmmTickFormulaService,
        DlmmBinFormulaService,
        ClmmRewardsFormulaService,
        ClmmFeesFormulaService,
        ClmmReservesFormulaService,
        ClmmUtilsService,
    ],
    exports: [
        ClmmTickFormulaService,
        DlmmBinFormulaService,
        ClmmRewardsFormulaService,
        ClmmFeesFormulaService,
        ClmmReservesFormulaService,
        ClmmUtilsService,
    ],
})
export class FormulasModule extends ConfigurableModuleClass {}
