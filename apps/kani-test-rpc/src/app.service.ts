import { MountStorageService } from "@modules/filesystem"
import { PrivyWalletService } from "@modules/privy"
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
    sendAndConfirmTransactionFactory,
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

@Injectable()
export class AppService implements OnModuleInit{
    constructor(
        private readonly privyWalletService: PrivyWalletService,
        private readonly mountStorageService: MountStorageService,
    ) {}

    async onModuleInit() {
        const rpc = createSolanaRpc("https://mainnet.helius-rpc.com/?api-key=61ebfd1f-ab3d-4a25-869a-80ded3456f52")
        const rpcSubscriptions = createSolanaRpcSubscriptions("wss://mainnet.helius-rpc.com/?api-key=61ebfd1f-ab3d-4a25-869a-80ded3456f52")
        const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
        const transferSolInstruction = getTransferSolInstruction({
            source: createNoopSigner(address("Dm2punindj5XrkPP4ihuuBacDCLNxsgQAAa8Vr8LjDnM")),
            destination: address("Dm2punindj5XrkPP4ihuuBacDCLNxsgQAAa8Vr8LjDnM"),
            amount: BigInt(1_000_000), // 0.001 SOL
        })
        const transactionMessage = pipe(
            createTransactionMessage({ version: 0 }),
            (tx) => setTransactionMessageFeePayerSigner(
                createNoopSigner(address("Dm2punindj5XrkPP4ihuuBacDCLNxsgQAAa8Vr8LjDnM")), 
                tx),
            (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
            (tx) => appendTransactionMessageInstructions([transferSolInstruction], tx),
            (tx) => compileTransaction(tx),
            (tx) => new Uint8Array(getTransactionEncoder().encode(tx))
        )
        
        const signer = this.privyWalletService.createSigner("tk8j2h0a05c0taebx8zhdsxk")
        const signedTransaction = await signer.signSolanaTransaction({ 
            transactionBytes: transactionMessage,
            authorizationContext: {
                authorization_private_keys: [this.mountStorageService.privySignerPrivateKey],
            },
        })
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
        const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
            rpc,
            rpcSubscriptions,
        })
        const txHash = getSignatureFromTransaction(transaction) 
        await sendAndConfirmTransaction(
            transaction,
            {
                commitment: "confirmed",
            }
        )
        console.log(txHash)
    }
}