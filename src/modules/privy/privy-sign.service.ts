import {
    Injectable
} from "@nestjs/common"
import {
    AuthorizationContext,
    PrivyClient
} from "@privy-io/node"
import {
    assertIsFullySignedTransaction,
    assertIsSendableTransaction,
    assertIsTransactionWithBlockhashLifetime,
    getBase64Encoder,
    getSignatureFromTransaction,
    getTransactionDecoder,
    getTransactionEncoder
} from "@solana/kit"
import {
    TransactionDataBuilder
} from "@mysten/sui/transactions"
import {
    messageWithIntent,
    toSerializedSignature
} from "@mysten/sui/cryptography"
import {
    fromHex,
    toBase64
} from "@mysten/bcs"
import {
    publicKeyFromRawBytes
} from "@mysten/sui/verify"
import {
    DerivedAesKeyService
} from "@modules/derived"
import {
    MountStorageService
} from "@modules/filesystem"
import {
    InjectPrivyClient
} from "./privy.decorators"
import {
    addLifetimeConstraint
} from "./utils"
import type {
    SignSolanaTxParams,
    SignSolanaTransactionResult,
    SignSuiTxParams,
    SignSuiTransactionResult
} from "./types"

/**
 * Signs Solana and Sui transactions via Privy wallet/signer.
 */
@Injectable()
export class PrivySignService {
    constructor(
        @InjectPrivyClient()
        private readonly privyClient: PrivyClient,
        private readonly derivedAesKeyService: DerivedAesKeyService,
        private readonly mountStorageService: MountStorageService,
    ) {}
    
    /**
     * Sign a Solana transaction with the wallet and apply blockhash lifetime.
     * @param params - The parameters for signing the Solana transaction.
     * @returns The signed transaction and the transaction hash.
     */ 
    async signSolanaTransaction(
        params: SignSolanaTxParams,
    ): Promise<SignSolanaTransactionResult> {
        const {
            walletId,
            transaction,
            encryptedPrivySignerPrivateKey,
            lifetimeConstraint,
        } = params
        console.log("tx")
        console.log(transaction)
        const transactionBytes = new Uint8Array(
            getTransactionEncoder().encode(transaction)
        )
        const privySignerPrivateKey = this.derivedAesKeyService.decrypt(encryptedPrivySignerPrivateKey)
        const signedTransaction = await this.privyClient.wallets().solana().signTransaction(
            walletId, 
            { 
                transaction: transactionBytes, 
                authorization_context: {
                    authorization_private_keys: [
                        this.mountStorageService.privySignerPrivateKey, 
                        privySignerPrivateKey
                    ],
                } 
            }
        )
        const decodedTransaction = getTransactionDecoder().decode(
            getBase64Encoder().encode(signedTransaction.signed_transaction),
        )
        addLifetimeConstraint({
            transaction: decodedTransaction,
            lifetimeConstraint,
        })
        assertIsFullySignedTransaction(decodedTransaction)
        assertIsSendableTransaction(decodedTransaction)
        assertIsTransactionWithBlockhashLifetime(decodedTransaction)
        const txHash = getSignatureFromTransaction(decodedTransaction)
        return {
            signedTransaction: decodedTransaction,
            txHash,
        }
    }

    /**
     * Sign a Sui transaction (raw sign) and return txHash + signatureWithBytes.
     * @param params - The parameters for signing the Sui transaction.
     * @returns The transaction hash and the signature with bytes.
     */
    async signSuiTransaction(
        params: SignSuiTxParams,
    ): Promise<SignSuiTransactionResult> {
        const {
            walletId,
            transaction,
            publicKeyHex,
            client,
            encryptedPrivySignerPrivateKey,
        } = params
        const publicKey = publicKeyFromRawBytes("ED25519",
            fromHex(publicKeyHex.slice(2) ?? ""))
        const accountAddress = publicKey.toSuiAddress()
        transaction.setSender(accountAddress)
        const rawBytes = await transaction.build({
            client 
        })
        const intentMessage = messageWithIntent("TransactionData",
            rawBytes)
        const bytes = Buffer.from(intentMessage).toString("hex")
        const txHash = TransactionDataBuilder.getDigestFromBytes(rawBytes)
        const privySignerPrivateKey = this.derivedAesKeyService.decrypt(encryptedPrivySignerPrivateKey)
        const authorizationContext: AuthorizationContext = {
            authorization_private_keys: [
                privySignerPrivateKey,
                this.mountStorageService.privySignerPrivateKey
            ],
        }
        const signedTransaction = await this.privyClient.wallets().rawSign(
            walletId, 
            { 
                params: {
                    bytes,
                    encoding: "hex",
                    hash_function: "blake2b256" as "keccak256" | "sha256",
                },
                authorization_context: authorizationContext,
            }
        )
        const txSignature = toSerializedSignature({
            signature: fromHex(
                signedTransaction.signature
            ),
            signatureScheme: "ED25519",
            publicKey
        })
        return {
            txHash,
            signatureWithBytes: {
                signature: txSignature,
                bytes: toBase64(rawBytes)
            },
        }
    }
}
