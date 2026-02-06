import {
    Injectable 
} from "@nestjs/common"
import {
    Wallet 
} from "ethers"
import {
    Ed25519Keypair 
} from "@mysten/sui/keypairs/ed25519"
import base58 from "bs58"
import {
    GenerateKeypairParams,
    GenerateKeypairResult,
    GetPrivateKeyParams,
    GetPrivateKeyResult
} from "./types/keypair"
import {
    PlatformId 
} from "../enums"
import {
    Keypair as SolanaKeypair 
} from "@solana/web3.js"
import {
    DerivedAesKeyService 
} from "@modules/derived"

/**
 * Service responsible for generating and managing cryptographic keypairs.
 * Supports multiple platforms: EVM, Sui, and Solana.
 *
 * @example
 * const service = new KeypairsService(...)
 * const keypair = await service.generateKeypair({ platformId: PlatformId.Sui })
 */
@Injectable()
export class KeypairsService {
    constructor(
        private readonly derivedAesKeyService: DerivedAesKeyService,
    ) {}

    /**
     * Generates a new keypair for the specified platform.
     * Creates a wallet/keypair, encrypts the private key, and returns the account address.
     *
     * @param param - Parameters for generating keypair
     * @param param.platformId - Platform identifier (EVM, Sui, or Solana)
     * @returns Generated keypair with account address and encrypted private key
     *
     * @example
     * const keypair = await service.generateKeypair({ platformId: PlatformId.Sui })
     */
    public async generateKeypair({
        platformId
    }: GenerateKeypairParams): Promise<GenerateKeypairResult> {
        switch (platformId) {
        case PlatformId.Evm: {
            // Generate random EVM wallet using ethers
            const evmWallet = Wallet.createRandom()
            // Encrypt the private key for secure storage
            const encryptedPrivateKeyPayload = this.derivedAesKeyService.encrypt(evmWallet.privateKey)
            return { 
                accountAddress: evmWallet.address, 
                encryptedPrivateKeyPayload 
            }
        }
        case PlatformId.Sui: {
            // Generate Sui Ed25519 keypair
            const suiWallet = Ed25519Keypair.generate()
            // Encrypt the secret key for secure storage
            const encryptedPrivateKeyPayload = this.derivedAesKeyService.encrypt(suiWallet.getSecretKey())
            return { 
                accountAddress: suiWallet.getPublicKey().toSuiAddress(), 
                encryptedPrivateKeyPayload 
            }
        }
        case PlatformId.Solana: {
            // Generate Solana keypair
            const solanaWallet = SolanaKeypair.generate()
            // Encode secret key as base58 and encrypt for secure storage
            const encryptedPrivateKeyPayload = this.derivedAesKeyService.encrypt(base58.encode(solanaWallet.secretKey))
            return { 
                accountAddress: solanaWallet.publicKey.toString(), 
                encryptedPrivateKeyPayload 
            }
        }
        }
    }

    /**
     * Decrypts and retrieves the private key from encrypted payload.
     * The decryption process is the same for all platforms (EVM, Sui, Solana).
     *
     * @param param - Parameters for getting private key
     * @param param.encryptedPrivateKeyPayload - Encrypted private key payload
     * @returns Decrypted private key as string
     *
     * @example
     * const privateKey = await service.getPrivateKey({ encryptedPrivateKeyPayload })
     */
    public async getPrivateKey({
        encryptedPrivateKeyPayload
    }: GetPrivateKeyParams): Promise<GetPrivateKeyResult> {
        // decrypt private key (same process for all platforms)
        return this.derivedAesKeyService.decrypt(encryptedPrivateKeyPayload)
    }
}
