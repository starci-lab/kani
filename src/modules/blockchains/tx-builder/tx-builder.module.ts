import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./tx-builder.module-definition"
import { 
    AnchorUtilsService, 
    AtaInstructionService, 
    KeypairGeneratorsService, 
    MintInstructionService
} from "./solana"
import { TransferInstructionService } from "./solana"
import { FetchCoinsService, SelectCoinsService } from "./sui"

@Module({
    providers: [
        AnchorUtilsService,
        AtaInstructionService,
        MintInstructionService,
        TransferInstructionService,
        KeypairGeneratorsService,
        FetchCoinsService,
        SelectCoinsService,
    ],
    exports: [
        AnchorUtilsService,
        AtaInstructionService,
        MintInstructionService,
        TransferInstructionService,
        KeypairGeneratorsService,
        FetchCoinsService,
        SelectCoinsService,
    ],
})
export class TxBuilderModule extends ConfigurableModuleClass {
}
