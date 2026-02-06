import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./keypairs.module-definition"
import {
    KeypairsService 
} from "./keypairs.service"

/**
 * Keypairs module.
 * Provides services for generating and managing cryptographic keypairs.
 */
/**
 * Module for managing cryptographic keypairs across multiple blockchain platforms.
 * Provides keypair generation and private key decryption services.
 */
@Module({
    providers: [KeypairsService],
    exports: [KeypairsService],
})
export class KeypairsModule extends ConfigurableModuleClass {}
