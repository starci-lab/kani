import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./tx-builder.module-definition"
import { AnchorUtilsService, AtaInstructionService } from "./solana"

@Module({
    providers: [
        AnchorUtilsService,
        AtaInstructionService,
    ],
    exports: [
        AnchorUtilsService,
        AtaInstructionService,
    ],
})
export class TxBuilderModule extends ConfigurableModuleClass {
}
