import { Injectable } from "@nestjs/common"
import { AuthorizationContext, PrivyClient } from "@privy-io/node"
import { InjectPrivyClient } from "./privy.decorators"
import { ChainId } from "@typedefs"
import { MountStorageService } from "@modules/filesystem"
import { 
    SolanaSignTransactionRpcResponse, 
    WalletRawSignResponse 
} from "@privy-io/node/resources"

@Injectable()
export class PrivyWalletService {
    constructor(
    @InjectPrivyClient()
    private readonly privyClient: PrivyClient,
    private readonly mountStorageService: MountStorageService
    ) {}

    /**
     * Create a new wallet for the user
     * @param chainId - The chain id
     * @returns The wallet
     */
    async createWallet(
        chainId: ChainId
    ) {
        return await this.privyClient
            .wallets()
            .create(
                {
                    chain_type: chainId,
                    policy_ids: [],
                    owner: {
                        public_key: this.mountStorageService.appConfig.privy.signer.publicKey,
                    }
                }
            )
    }
    
    /**
     * Sign a transaction
     * @param params - The parameters for signing the transaction
     * @returns The signed transaction
     */
    private async signRawTransaction(
        {
            walletId,
            transactionBytes,
            encoding,
            hashFunction,
            authorizationContext,
        }: SignRawTransactionParams
    ) {
        return await this.privyClient.wallets().rawSign(
            walletId, {
                params: {
                    encoding,
                    bytes: transactionBytes,
                    hash_function: hashFunction,
                },
                authorization_context: authorizationContext,
            }
        )
    }
    /**
     * Sign a solana transaction
     * @param params - The parameters for signing the transaction
     * @returns The signed transaction
     */
    private async signSolanaTransaction(
        {
            walletId,
            transactionBytes,
            authorizationContext,
        }: SignSolanaTransactionParams
    ) {
        return await this.privyClient.wallets().solana().signTransaction(
            walletId, {
                transaction: transactionBytes,
                authorization_context: authorizationContext,
            }
        )
    }
    /**
     * Create a raw signer
     * @param walletId - The wallet id
     * @returns The raw signer
     */
    createSigner(
        walletId: string
    ): PrivySigner {
        return {
            signRawTransaction: async (
                params: Omit<SignRawTransactionParams, "walletId">
            ) => await this.signRawTransaction({ walletId, ...params }),
            signSolanaTransaction: async (
                params: Omit<SignSolanaTransactionParams, "walletId">
            ) => await this.signSolanaTransaction({ walletId, ...params })
        }
    }
}

export interface SignTransactionParams {
    walletId: string
    transactionBytes: string
}

export interface SignSolanaTransactionParams {
    walletId: string
    transactionBytes: Uint8Array
    authorizationContext: AuthorizationContext
}

export interface SignRawTransactionParams {
    walletId: string
    transactionBytes: string
    encoding: "utf-8" | "hex"
    hashFunction: "keccak256" | "sha256"
    authorizationContext: AuthorizationContext
}

export interface PrivySigner {
    signRawTransaction: (
        params: Omit<SignRawTransactionParams, "walletId">
    ) => Promise<WalletRawSignResponse.Data>
    signSolanaTransaction: (
        params: Omit<SignSolanaTransactionParams, "walletId">
    ) => Promise<SolanaSignTransactionRpcResponse.Data>
}