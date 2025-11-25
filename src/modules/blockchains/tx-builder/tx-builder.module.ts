import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./tx-builder.module-definition"
import { 
    AnchorUtilsService, 
    AtaInstructionService, 
    KeypairGeneratorsService, 
    MintInstructionService
} from "./solana"
import { TransferInstructionService } from "./solana"

@Module({
    providers: [
        AnchorUtilsService,
        AtaInstructionService,
        MintInstructionService,
        TransferInstructionService,
        KeypairGeneratorsService,
    ],
    exports: [
        AnchorUtilsService,
        AtaInstructionService,
        MintInstructionService,
        TransferInstructionService,
        KeypairGeneratorsService,
    ],
})
export class TxBuilderModule extends ConfigurableModuleClass {
}
