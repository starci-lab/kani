import {
    Injectable 
} from "@nestjs/common"
import {
    ethers 
} from "ethers"
import {
    DerivedAesKeyService 
} from "@modules/derived"
import {
    BotEncryptedPrivateKeyNotFoundException 
} from "@modules/exceptions"
import {
    SuiSignerService 
} from "./sui.service"
import {
    SolanaSignerService 
} from "./solana.service"
import {
    WithEvmSignerParams,
    WithSuiSignerParams,
    WithSolanaSignerParams
} from "./types"

/**
 * Unified service for managing blockchain signers across multiple platforms.
 * Provides a single interface for Sui, Solana, and EVM signer operations.
 *
 * @example
 * const service = new SignerService(...)
 * await service.withSuiSigner({ bot, action: async (signer) => { ... } })
 * await service.withSolanaSigner({ bot, action: async (signer) => { ... } })
 * await service.withEvmSigner({ bot, action: async (signer) => { ... } })
 */
@Injectable()
export class SignerService {
    constructor(
        private readonly derivedAesKeyService: DerivedAesKeyService,
        private readonly suiSignerService: SuiSignerService,
        private readonly solanaSignerService: SolanaSignerService,
    ) {}

    /**
     * Executes an action with a Sui signer.
     * Delegates to SuiSignerService for Sui-specific signer operations.
     *
     * @param param - Parameters for executing action with Sui signer
     * @param param.bot - Bot schema containing encrypted private key
     * @param param.action - Action to execute with the signer
     * @returns Result of the action execution
     *
     * @example
     * await service.withSuiSigner({
     *   bot: botSchema,
     *   action: async (signer) => {
     *     // Use signer to sign Sui transactions
     *     return result
     *   }
     * })
     */
    public withSuiSigner<TResponse = void>({
        bot,
        action,
    }: WithSuiSignerParams<TResponse>): Promise<TResponse> {
        // Delegate to Sui signer service
        return this.suiSignerService.withSigner({
            bot,
            action,
        })
    }

    /**
     * Executes an action with a Solana signer.
     * Delegates to SolanaSignerService for Solana-specific signer operations.
     *
     * @param param - Parameters for executing action with Solana signer
     * @param param.bot - Bot schema containing encrypted private key
     * @param param.action - Action to execute with the signer
     * @returns Result of the action execution
     *
     * @example
     * await service.withSolanaSigner({
     *   bot: botSchema,
     *   action: async (signer) => {
     *     // Use signer to sign Solana transactions
     *     return result
     *   }
     * })
     */
    public withSolanaSigner<TResponse = void>({
        bot,
        action,
    }: WithSolanaSignerParams<TResponse>): Promise<TResponse> {
        // Delegate to Solana signer service
        return this.solanaSignerService.withSigner({
            bot,
            action,
        })
    }

    /**
     * Executes an action with an EVM signer.
     * Creates an ethers Wallet signer from the bot's encrypted private key.
     *
     * @param param - Parameters for executing action with EVM signer
     * @param param.bot - Bot schema containing encrypted private key
     * @param param.action - Action to execute with the signer
     * @returns Result of the action execution
     *
     * @example
     * await service.withEvmSigner({
     *   bot: botSchema,
     *   action: async (signer) => {
     *     // Use signer to sign EVM transactions
     *     return result
     *   }
     * })
     */
    public async withEvmSigner<TResponse = void>({
        bot,
        action,
    }: WithEvmSignerParams<TResponse>): Promise<TResponse> {
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
            // Create ethers Wallet from private key
            const signer = new ethers.Wallet(Buffer.from(privateKey).toString("hex"))
            // Execute action with signer
            return await action(signer)
        } finally {
            // Clear private key from memory
            if (privateKey) privateKey = null
        }
    }
}
