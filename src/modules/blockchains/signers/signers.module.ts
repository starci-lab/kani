import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./signers.module-definition"
import {
    SignerService 
} from "./signer.service"
import {
    SuiSignerService 
} from "./sui.service"
import {
    SolanaSignerService 
} from "./solana.service"

/**
 * Module for managing blockchain signers across multiple platforms.
 * Provides unified signer services for Sui, Solana, and EVM blockchains.
 */
@Module({
    providers: [
        SuiSignerService,
        SolanaSignerService,
        SignerService,
    ],
    exports: [
        SuiSignerService,
        SolanaSignerService,
        SignerService,
    ],
})
export class SignersModule extends ConfigurableModuleClass {}