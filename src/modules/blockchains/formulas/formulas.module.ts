import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./formulas.module-definition"
import { ClmmTickFormulaService } from "./clmm-tick.service"
import { DlmmBinFormulaService } from "./dlmm-bin.service"
import { ClmmRewardsFormulaService } from "./clmm-rewards.service"
import { ClmmUtilsService } from "./clmm-utils.service"
import { ClmmFeesFormulaService } from "./clmm-fees.service"
import { ClmmReservesService } from "./clmm-reserves.service"
@Module({
    providers: [
        ClmmTickFormulaService,
        DlmmBinFormulaService,
        ClmmRewardsFormulaService,
        ClmmFeesFormulaService,
        ClmmReservesService,
        ClmmUtilsService,
    ],
    exports: [
        ClmmTickFormulaService,
        DlmmBinFormulaService,
        ClmmRewardsFormulaService,
        ClmmFeesFormulaService,
        ClmmReservesService,
        ClmmUtilsService,
    ],
})
export class FormulasModule extends ConfigurableModuleClass {}
