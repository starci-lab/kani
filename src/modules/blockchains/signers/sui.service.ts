import {
    Injectable 
} from "@nestjs/common"
import {
    Ed25519Keypair as SuiEd25519Keypair 
} from "@mysten/sui/keypairs/ed25519"
import {
    DerivedAesKeyService 
} from "@modules/derived"
import {
    BotEncryptedPrivateKeyNotFoundException 
} from "@exceptions"
import {
    WithSuiSignerParams 
} from "./types/sui"

/**
 * Service for managing Sui blockchain signers.
 * Handles creation and management of Sui Ed25519 keypairs for transaction signing.
 *
 * @example
 * const service = new SuiSignerService(...)
 * await service.withSigner({ bot, action: async (signer) => { ... } })
 */
@Injectable()
export class SuiSignerService {
    constructor(
        private readonly derivedAesKeyService: DerivedAesKeyService,
    ) {}

    /**
     * Executes an action with a Sui signer.
     * Decrypts the bot's private key and creates a Sui Ed25519 keypair signer.
     *
     * @param param - Parameters for executing action with Sui signer
     * @param param.bot - Bot schema containing encrypted private key
     * @param param.action - Action to execute with the signer
     * @returns Result of the action execution
     *
     * @example
     * await service.withSigner({
     *   bot: botSchema,
     *   action: async (signer) => {
     *     // Use signer to sign transactions
     *     return result
     *   }
     * })
     */
    async withSigner<TResponse = void>({
        bot,
        action,
    }: WithSuiSignerParams<TResponse>): Promise<TResponse> {
        // Validate encrypted private key exists
        if (!bot.encryptedPrivateKeyPayload) {
            throw new BotEncryptedPrivateKeyNotFoundException({
                id: bot.id,
            })
        }
        let privateKey: string | null = null
        try {
            // Decrypt private key from encrypted payload
            privateKey = this.derivedAesKeyService.decrypt(
                bot.encryptedPrivateKeyPayload,
            )
            // Create Sui Ed25519 keypair from secret key
            const signer = SuiEd25519Keypair.fromSecretKey(privateKey)
            // Execute action with signer
            return await action(signer)
        } finally {
            // Clear private key from memory
            if (privateKey) privateKey = null
        }
    }
}
