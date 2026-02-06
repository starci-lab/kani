import {
    Injectable 
} from "@nestjs/common"
import {
    createKeyPairFromBytes,
    createSignerFromKeyPair,
} from "@solana/kit"
import bs58 from "bs58"
import {
    DerivedAesKeyService 
} from "@modules/derived"
import {
    BotEncryptedPrivateKeyNotFoundException 
} from "@exceptions"
import {
    WithSolanaSignerParams 
} from "./types/solana"

/**
 * Service for managing Solana blockchain signers.
 * Handles creation and management of Solana keypair signers for transaction signing.
 *
 * @example
 * const service = new SolanaSignerService(...)
 * await service.withSigner({ bot, action: async (signer) => { ... } })
 */
@Injectable()
export class SolanaSignerService {
    constructor(
        private readonly derivedAesKeyService: DerivedAesKeyService,
    ) {}

    /**
     * Executes an action with a Solana signer.
     * Decrypts the bot's private key and creates a Solana keypair signer.
     *
     * @param param - Parameters for executing action with Solana signer
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
    }: WithSolanaSignerParams<TResponse>): Promise<TResponse> {
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
            // Decode base58 private key to bytes
            const keyPairBytes = bs58.decode(privateKey)
            // Create Solana keypair from bytes
            const keyPair = await createKeyPairFromBytes(keyPairBytes)
            // Create Solana kit signer from keypair
            const signer = await createSignerFromKeyPair(keyPair)
            // Execute action with signer
            return await action(signer)
        } finally {
            // Clear private key from memory
            if (privateKey) privateKey = null
        }
    }
}
