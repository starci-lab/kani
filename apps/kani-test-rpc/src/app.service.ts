import { MountStorageService } from "@modules/filesystem"
import { Injectable, OnModuleInit } from "@nestjs/common"
import { getTransferSolInstruction } from "@solana-program/system"
import { 
    address, 
    pipe, 
    compileTransaction, 
    createNoopSigner, 
    getTransactionEncoder, 
    setTransactionMessageLifetimeUsingBlockhash, 
    setTransactionMessageFeePayerSigner, 
    createSolanaRpc, 
    createTransactionMessage, 
    appendTransactionMessageInstructions, 
    getBase64Encoder,
    getTransactionDecoder,
    getSignatureFromTransaction,
    createSolanaRpcSubscriptions,
    assertIsSendableTransaction,
    assertIsFullySignedTransaction,
    assertIsTransactionWithBlockhashLifetime,
    SignaturesMap,
    TransactionWithBlockhashLifetime,
    TransactionMessageBytes,
    TransactionWithinSizeLimit,
    FullySignedTransaction
} from "@solana/kit"
import { PrivyClient } from "@privy-io/node"
import { InjectPrivyClient } from "@modules/privy"
import { Connection } from "mongoose"
import { BotSchema, InjectPrimaryMongoose } from "@modules/databases"
import { DerivedAesKeyService } from "@modules/derived"

@Injectable()
export class AppService implements OnModuleInit{
    constructor(
        private readonly mountStorageService: MountStorageService,
        @InjectPrivyClient()
        private readonly privyClient: PrivyClient,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly derivedAesKeyService: DerivedAesKeyService,
    ) {}

    async onModuleInit() {
        const rpc = createSolanaRpc("https://mainnet.helius-rpc.com/?api-key=61ebfd1f-ab3d-4a25-869a-80ded3456f52")
        const rpcSubscriptions = createSolanaRpcSubscriptions("wss://mainnet.helius-rpc.com/?api-key=61ebfd1f-ab3d-4a25-869a-80ded3456f52")
        const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
        const transferSolInstruction = getTransferSolInstruction({
            source: createNoopSigner(address("GDJwFdAUvGXicYjmiXnnfsi5FpGg4Tw7AAXbffUZuDBs")),
            destination: address("GDJwFdAUvGXicYjmiXnnfsi5FpGg4Tw7AAXbffUZuDBs"),
            amount: BigInt(1_000_000), // 0.001 SOL
        })
        const transactionMessage = pipe(
            createTransactionMessage({ version: 0 }),
            (tx) => setTransactionMessageFeePayerSigner(
                createNoopSigner(address("GDJwFdAUvGXicYjmiXnnfsi5FpGg4Tw7AAXbffUZuDBs")), 
                tx),
            (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
            (tx) => appendTransactionMessageInstructions([transferSolInstruction], tx),
            (tx) => compileTransaction(tx),
            (tx) => new Uint8Array(getTransactionEncoder().encode(tx))
        )
        const bot = await this.connection.model<BotSchema>(BotSchema.name).findById("69621f583b3c9277240817c3")
        if (!bot) {
            throw new Error("Bot not found")
        }
        const signedTransaction = await this.privyClient.wallets().solana().signTransaction(
            bot.privyMetadata.walletId,
            { 
                transaction: transactionMessage,
                authorization_context: {
                    authorization_private_keys: [
                        this.derivedAesKeyService.decrypt(bot.encryptedPrivySignerPrivateKeyPayload),
                        this.mountStorageService.privySignerPrivateKey,
                    ],
                },
            }
        )
        // reconstruct the transaction
        const transaction = getTransactionDecoder().decode(
            getBase64Encoder().encode(signedTransaction.signed_transaction),
        )
        assertIsFullySignedTransaction(transaction)
        console.log(`Is fully signed transaction: ${transaction}`)
        assertIsSendableTransaction(transaction)
        console.log(`Is sendable transaction: ${transaction}`)
        const tx: FullySignedTransaction & TransactionWithinSizeLimit & Readonly<{
            messageBytes: TransactionMessageBytes;
            signatures: SignaturesMap;
        }> & TransactionWithBlockhashLifetime = transaction as any
        (tx as any).lifetimeConstraint = {
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        }
        assertIsTransactionWithBlockhashLifetime(transaction)
        console.log(`Is transaction with blockhash lifetime: ${transaction}`)
        // test send transaction
        // const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
        //     rpc,
        //     rpcSubscriptions,
        // })
        const txHash = getSignatureFromTransaction(transaction) 
        // await sendAndConfirmTransaction(
        //     transaction,
        //     {
        //         commitment: "confirmed",
        //     }
        // )
        console.log(txHash)
    }
}