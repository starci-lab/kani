import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./tx-builder.module-definition"
import { AnchorUtilsService, AtaInstructionService, MintInstructionService } from "./solana"
import { TransferInstructionService } from "./solana"

@Module({
    providers: [
        AnchorUtilsService,
        AtaInstructionService,
        MintInstructionService,
        TransferInstructionService,
    ],
    exports: [
        AnchorUtilsService,
        AtaInstructionService,
        MintInstructionService,
        TransferInstructionService,
    ],
})
export class TxBuilderModule extends ConfigurableModuleClass {
}
