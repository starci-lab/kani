import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./formulas.module-definition"
import { ClmmTickFormulaService } from "./clmm-tick.service"
import { DlmmBinFormulaService } from "./dlmm-bin.service"
@Module({
    providers: [
        ClmmTickFormulaService,
        DlmmBinFormulaService,
    ],
    exports: [
        ClmmTickFormulaService,
        DlmmBinFormulaService,
    ],
})
export class FormulasModule extends ConfigurableModuleClass {}
