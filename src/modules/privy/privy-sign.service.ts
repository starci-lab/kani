import { Injectable } from "@nestjs/common"
import { InjectPrivyClient } from "./privy.decorators"
import { AuthorizationContext, PrivyClient } from "@privy-io/node"
import { DerivedAesKeyService } from "@modules/derived"
import { EncryptedPayload } from "@typedefs"
import { FullySolanaTransaction, SolanaTransaction } from "./types"
import { 
    assertIsFullySignedTransaction, 
    getBase64Encoder, 
    getSignatureFromTransaction, 
    getTransactionDecoder, 
    getTransactionEncoder, 
    TransactionBlockhashLifetime 
} from "@solana/kit"
import { addLifetimeConstraint } from "./utils"
import { assertIsSendableTransaction } from "@solana/kit"
import { assertIsTransactionWithBlockhashLifetime } from "@solana/kit"
import { Transaction, TransactionDataBuilder } from "@mysten/sui/transactions"
import { SuiClient } from "@mysten/sui/client"
import { messageWithIntent, SignatureWithBytes, toSerializedSignature } from "@mysten/sui/cryptography"
import { fromHex, toBase64 } from "@mysten/bcs"
import { publicKeyFromRawBytes } from "@mysten/sui/verify"

@Injectable()
export class PrivySignService {
    constructor(
        @InjectPrivyClient()
        private readonly privyClient: PrivyClient,
        private readonly derivedAesKeyService: DerivedAesKeyService,
    ) {}
    
    async signSolanaTransaction(
        {
            walletId,
            transaction,
            encryptedPrivySignerPrivateKey,
            lifetimeConstraint,
        }: SignSolanaTransactionParams
    ) {
        const transactionBytes = new Uint8Array(
            getTransactionEncoder().encode(transaction)
        )
        const privySignerPrivateKey = this.derivedAesKeyService.decrypt(encryptedPrivySignerPrivateKey)
        const authorizationContext: AuthorizationContext = {
            authorization_private_keys: [privySignerPrivateKey],
        }
        const signedTransaction = await this.privyClient.wallets().solana().signTransaction(
            walletId, 
            { 
                transaction: transactionBytes, 
                authorization_context: authorizationContext 
            }
        )
        const decodedTransaction = getTransactionDecoder().decode(
            getBase64Encoder().encode(signedTransaction.signed_transaction),
        )
        addLifetimeConstraint(decodedTransaction, lifetimeConstraint)
        assertIsFullySignedTransaction(decodedTransaction)
        assertIsSendableTransaction(decodedTransaction)
        assertIsTransactionWithBlockhashLifetime(decodedTransaction)
        const txHash = getSignatureFromTransaction(decodedTransaction)
        return {
            signedTransaction: decodedTransaction,
            txHash,
        }
    }

    async signSuiTransaction(
        {
            walletId,
            transaction,
            publicKeyHex,
            client,
            encryptedPrivySignerPrivateKey,
        }: SignSuiTransactionParams
    ): Promise<SignSuiTransactionResponse> {
        const publicKey = publicKeyFromRawBytes("ED25519", fromHex(publicKeyHex.slice(2) ?? ""))
        const accountAddress = publicKey.toSuiAddress()
        transaction.setSender(accountAddress)
        const rawBytes = await transaction.build({ client })
        const intentMessage = messageWithIntent("TransactionData", rawBytes)
        const bytes = Buffer.from(intentMessage).toString("hex")
        const txHash = TransactionDataBuilder.getDigestFromBytes(rawBytes)
        const privySignerPrivateKey = this.derivedAesKeyService.decrypt(encryptedPrivySignerPrivateKey)
        const authorizationContext: AuthorizationContext = {
            authorization_private_keys: [privySignerPrivateKey],
        }
        const signedTransaction = await this.privyClient.wallets().rawSign(
            walletId, 
            { 
                params: {
                    bytes,
                    encoding: "hex",
                    hash_function: "blake2b256" as "keccak256" | "sha256",
                },
                authorization_context: authorizationContext 
            }
        )
        const txSignature = toSerializedSignature({
            signature: fromHex(signedTransaction.signature),
            signatureScheme: "ED25519",
            publicKey
        })
        return {
            txHash,
            signatureWithBytes: {
                signature: txSignature,
                bytes: toBase64(rawBytes)
            }
        }
    }
}

export interface SignTransactionParams<T> {
    walletId: string
    transaction: T
    encryptedPrivySignerPrivateKey: EncryptedPayload
}
export interface SignSolanaTransactionParams extends SignTransactionParams<SolanaTransaction> {
    lifetimeConstraint: TransactionBlockhashLifetime
}

export interface SignSuiTransactionParams extends SignTransactionParams<Transaction> {
    publicKeyHex: string
    client: SuiClient
}

export interface SignSuiTransactionResponse {
    txHash: string
    signatureWithBytes: SignatureWithBytes
}

export interface SignSolanaTransactionResponse {
    signedTransaction: FullySolanaTransaction
    txHash: string
}