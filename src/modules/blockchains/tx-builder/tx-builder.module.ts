import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./tx-builder.module-definition"
import { AnchorUtilsService, AtaInstructionService, MintInstructionService } from "./solana"

@Module({
    providers: [
        AnchorUtilsService,
        AtaInstructionService,
        MintInstructionService,
    ],
    exports: [
        AnchorUtilsService,
        AtaInstructionService,
        MintInstructionService,
    ],
})
export class TxBuilderModule extends ConfigurableModuleClass {
}
