import {
    Injectable 
} from "@nestjs/common"
import {
    TokenType 
} from "@modules/typedefs"
import {
    FetchBalanceParams,
    FetchBalanceResult,
    IBalanceService,
    PrepareSwapTransactionParams,
    PrepareSwapTransactionResult,
    ExecuteSwapTransactionParams,
} from "./balance.interface"
import { 
    AppVersion,
} from "@modules/databases"
import {
    EncryptedPrivySignerPrivateKeyNotFoundException,
    ErrorTransactionType,
    MissingSolanaTxParamException,
    PrivyMetadataNotFoundException
} from "@modules/exceptions"
import BN from "bn.js"
import {
    address,
    getCompiledTransactionMessageDecoder,
    getTransactionDecoder,
    getBase64Encoder,
    decompileTransactionMessageFetchingLookupTables,
    setTransactionMessageLifetimeUsingBlockhash,
    appendTransactionMessageInstructions,
    compileTransaction,
    signTransaction,
    setTransactionMessageFeePayerSigner,
    pipe,
    createTransactionMessage,
    Rpc,
    SolanaRpcApi,
    assertIsSendableTransaction,
    assertIsTransactionWithinSizeLimit,
    sendAndConfirmTransactionFactory,
    RpcSubscriptions,
    getSignatureFromTransaction,
    SolanaRpcSubscriptionsApi,
    createNoopSigner,
    signature,
} from "@solana/kit"
import { 
    findAssociatedTokenPda, 
    TOKEN_PROGRAM_ADDRESS, 
} from "@solana-program/token"
import {
    fetchToken as fetchToken2022,
    TOKEN_2022_PROGRAM_ADDRESS,
} from "@solana-program/token-2022"
import {
    fetchToken 
} from "@solana-program/token"
import {
    SolanaAggregatorSelectorService 
} from "../aggregators"
import {
    SignerService 
} from "../signers"
import {
    BotSchema, TokenSchema 
} from "@modules/databases"
import {
    RpcExecutorService 
} from "@modules/blockchains"
import {
    RpcAccessType 
} from "@modules/filesystem"
import {
    PrivySignService 
} from "@modules/privy"
import {
    WinstonLog,
    WinstonService 
} from "@modules/winston"

@Injectable()
export class SolanaBalanceService implements IBalanceService {
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly solanaAggregatorSelectorService: SolanaAggregatorSelectorService,
        private readonly signerService: SignerService,
        private readonly privySignService: PrivySignService,
        private readonly winstonService: WinstonService,
    ) { }

    public async fetchBalance(
        {
            bot,
            token,
        }: FetchBalanceParams
    ): Promise<FetchBalanceResult> {
        return await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Http,
            callback: async ({ rpc }) => {
                // return the native token balance
                if (token.type === TokenType.Native) {
                    const balance = await rpc.getBalance(address(bot.accountAddress)).send()
                    return {
                        balanceAmount: new BN(balance.value.toString()),
                    }
                }
                // return the token balance
                const mintAddress = address(token.tokenAddress)
                const ownerAddress = address(bot.accountAddress)
                // Derive the user's associated token account (ATA)
                // This is required because balances are stored in ATA, not in the owner wallet directly.
                const [
                    ataAddress
                ] = await findAssociatedTokenPda(
                    {
                        mint: mintAddress,
                        owner: ownerAddress,
                        tokenProgram:
                    token.is2022Token
                        ? TOKEN_2022_PROGRAM_ADDRESS
                        : TOKEN_PROGRAM_ADDRESS,
                    }
                )

                // Token-2022 accounts are handled by the newer token-2022 program.
                try {
                    if (token.is2022Token) {
                        const token2022 = await fetchToken2022(rpc,
                            ataAddress)
                        return {
                            balanceAmount: new BN(token2022.data.amount.toString()),
                        }
                    } else {
                        // Standard SPL token account
                        const tokenAccount = await fetchToken(rpc,
                            ataAddress)
                        return {
                            balanceAmount: new BN(tokenAccount.data.amount.toString()),
                        }
                    }
                } catch {
                    // we dont find the ata address, so the balance is 0
                    return {
                        balanceAmount: new BN(0),
                    }
                }
            },
        })
        
    }

    public async prepareSwapTransaction(
        {
            bot,
            tokenIn,
            tokenOut,
            amountIn,
        }: PrepareSwapTransactionParams
    ): Promise<PrepareSwapTransactionResult> {
        const batchQuoteResult = await this.solanaAggregatorSelectorService.batchQuote({
            tokenIn,
            tokenOut,
            amountIn: amountIn,
            senderAddress: bot.accountAddress,
        })
        // we fetch the serialized transaction from the aggregator
        const { payload: serializedTransaction } = await this.solanaAggregatorSelectorService.selectorSwap({
            base: {
                payload: batchQuoteResult.response.payload,
                tokenIn,
                tokenOut,
                accountAddress: bot.accountAddress,
            },
            aggregatorId: batchQuoteResult.aggregatorId,
        })
        // we decode the serialized transaction
        const swapTransactionBytes = getBase64Encoder().encode(serializedTransaction as string)
        const swapTransaction = getTransactionDecoder().decode(swapTransactionBytes)
        const compiledSwapTransactionMessage = getCompiledTransactionMessageDecoder().decode(
            swapTransaction.messageBytes,
        )
        return await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Http,
            callback: async ({ rpc }) => {
                const swapTransactionMessage = await decompileTransactionMessageFetchingLookupTables(
                    compiledSwapTransactionMessage,
                    rpc
                )
                // we get the swap instructions
                const swapInstructions = swapTransactionMessage.instructions
                // we get the latest blockhash
                const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
                const transactionMessage = pipe(
                    createTransactionMessage({
                        version: 0 
                    }),
                    (tx) => setTransactionMessageFeePayerSigner(createNoopSigner(address(bot.accountAddress)),
                        tx),
                    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash,
                        tx),
                    (tx) => appendTransactionMessageInstructions(swapInstructions,
                        tx),
                )
                const transaction = compileTransaction(transactionMessage)
                if (bot.version === AppVersion.V1) {
                    return await this.signerService.withSolanaSigner({
                        bot,
                        action: async (signer) => {
                            // sign the transaction
                            const signedTransaction = await signTransaction(
                                [signer.keyPair],
                                transaction,
                            )
                            const transactionSignature = getSignatureFromTransaction(signedTransaction)
                            const txHash = transactionSignature.toString()
                            assertIsSendableTransaction(signedTransaction)
                            assertIsTransactionWithinSizeLimit(signedTransaction)
                            return {
                                txHash,
                                solanaTx: signedTransaction,
                                tokenIn,
                                tokenOut,
                            }
                        },
                    })
                } else {
                    if (!bot.privyMetadata) {
                        throw new PrivyMetadataNotFoundException({
                            botId: bot.id,
                        })
                    }
                    if (!bot.encryptedPrivySignerPrivateKeyPayload) {
                        throw new EncryptedPrivySignerPrivateKeyNotFoundException({
                            botId: bot.id,
                        })
                    }
                    const signedTransaction = await this.privySignService.signSolanaTransaction({
                        lifetimeConstraint: {
                            blockhash: latestBlockhash.blockhash,
                            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
                        },
                        transaction,
                        encryptedPrivySignerPrivateKey: bot.encryptedPrivySignerPrivateKeyPayload,
                        walletId: bot.privyMetadata.walletId,
                    })
                    return {
                        txHash: signedTransaction.txHash,
                        solanaTx: signedTransaction.signedTransaction,
                        tokenIn,
                        tokenOut,
                    }
                }
            },
        })
    }

    public async executeSwapTransaction(
        {
            bot,
            txHash,
            solanaTx,
            tokenIn,
            tokenOut,
        }: ExecuteSwapTransactionParams
    ): Promise<void> {
        const transaction = await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Http,
            callback: async ({ rpc }) => {
                return await rpc.getTransaction(signature(txHash),
                    {
                        commitment: "confirmed", encoding: "base58" 
                    }).send()

            },
        })
        if (transaction) {
            return
        }
        if (!solanaTx) {
            throw new MissingSolanaTxParamException({
                botId: bot.id,
                type: ErrorTransactionType.Swap,
            })
        }
        await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Write,
            callback: async ({ rpc, rpcSubscriptions }) => {
                const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
                    rpc,
                    rpcSubscriptions,
                })
                const transactionSignature = getSignatureFromTransaction(solanaTx)
                await sendAndConfirmTransaction(
                    solanaTx,
                    {
                        commitment: "confirmed",
                    })
                this.winstonService.log(
                    WinstonLog.SwapTransactionExecuted,
                    {
                        botId: bot.id,
                        txHash: transactionSignature.toString(),
                        tokenIn: tokenIn.displayId,
                        tokenOut: tokenOut.displayId,
                    }
                )
            },
        })
    }
}   

export interface ComputeTargetToQuoteSwapParams {
    targetToken: TokenSchema
    quoteToken: TokenSchema
    targetBalanceAmount: BN
    quoteBalanceAmount: BN
}

export interface ComputeTargetToQuoteSwapResult {
    inputAmount: BN
    estimatedOutputAmount: BN
    requiredSwap: boolean
}

export interface CreateTransferFeesTransactionParams {
    bot: BotSchema
    rpc: Rpc<SolanaRpcApi>
    rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>
    feeAmount: BN
}