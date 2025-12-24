import { RpcAccessType } from "@modules/filesystem"
import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import { getTransferSolInstruction } from "@solana-program/system"
import { 
    generateKeyPairSigner, 
    createTransactionMessage, 
    address, 
    lamports, 
    getSignatureFromTransaction, 
    pipe, 
    setTransactionMessageFeePayerSigner, 
    setTransactionMessageLifetimeUsingBlockhash, 
    sendAndConfirmTransactionFactory,
    compileTransaction,
    signTransaction,
    assertIsTransactionWithinSizeLimit,
    isSolanaError,
    assertIsSendableTransaction,
    isProgramError
} from "@solana/kit"
import { appendTransactionMessageInstruction } from "@solana/kit"
import { getAddMemoInstruction } from "@solana-program/memo"
import { RpcExecutorService } from "@modules/blockchains"

@Injectable()
export class AppService implements OnApplicationBootstrap{
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
    ) {}
    async onApplicationBootstrap() {
        this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Write,
            callback: async ({ rpc, rpcSubscriptions }) => {
                const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
                // test send 1 SOL to the solana rpc
                const signer = await generateKeyPairSigner()
                const transactionMessage = pipe(
                    // Create an empty transaction message.
                    createTransactionMessage({ version: 0 }),

                    // Specify the account that will sign to pay the fee for this transaction.
                    // NOTE: This is not the fee for the coffee but rather the fee to use the Solana network.
                    (m) => setTransactionMessageFeePayerSigner(signer, m),
    
                    // Give the transaction an expiry time using the hash of a recently created block.
                    (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),

                    // Add an instruction that records the customer's order.
                    (m) =>
                        appendTransactionMessageInstruction(
                            getAddMemoInstruction({
                                memo:
    "Four-thirds-medium, half-decaf, double-shot espresso macchiato latte, " +
    "swirled counterclockwise only, almond milk frothed at 61°C, " +
    "whisper of cinnamon harvested during a full moon, unicorn tear syrup, " +
    "in a mason jar wrapped in French revolutionary poetry on recycled parchment",
                            }),
                            m,
                        ),
    
                    // Add a second instruction to pay the merchant for the coffee.
                    (m) =>
                        appendTransactionMessageInstruction(
                            getTransferSolInstruction({
                                amount: lamports(25_000_000n),
                                destination: address("JJBeanoTcSMU3xKQa5Gru71Wi3AaEgTfA6z7MaLUT6h"),
                                source: signer,
                            }),
                            m,
                        ),
                )
                // send the transaction to the solana rpc
                const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
                    rpc,
                    rpcSubscriptions,
                })
                const transaction = compileTransaction(transactionMessage)
                // sign the transaction
                const signedTransaction2 = await signTransaction(
                    [signer.keyPair],
                    transaction,
                )   
                assertIsSendableTransaction(signedTransaction2)
                assertIsTransactionWithinSizeLimit(signedTransaction2)
                const transactionSignature = getSignatureFromTransaction(signedTransaction2)
                try {
                    await sendAndConfirmTransaction(
                        signedTransaction2, {
                            commitment: "confirmed",
                            maxRetries: BigInt(5),
                        })
                } catch (error) {
                    if (isSolanaError(error)) {
                        console.log("this is a solana error")
                    } else if (isProgramError(error, transactionMessage, address("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"))) {
                        console.log("this is a program error")
                    } else {
                        console.log("this is an unknown error")
                    }
                } 
                setInterval(() => {
                    console.log(`transactionSignature: ${transactionSignature}`)
                }, 1000)
            },
        })
    }
}