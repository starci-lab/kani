import { Injectable } from "@nestjs/common"
import { TokenType } from "@typedefs"
import {
    FetchBalanceParams,
    FetchBalanceResponse,
    IBalanceService,
    PrepareSwapTransactionParams,
    PrepareSwapTransactionResponse,
    ExecuteSwapTransactionParams,
} from "./balance.interface"
import { 
    AppVersion,
    PrimaryMemoryStorageService, 
} from "@modules/databases"
import {
    TokenNotFoundException,
    TransactionNotExecutedException,
} from "@exceptions"
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
import { fetchToken } from "@solana-program/token"
import { SolanaAggregatorSelectorService } from "../aggregators"
import { EnsureMathService } from "../math"
import { SignerService } from "../signers"
import { BotSchema, TokenSchema } from "@modules/databases"
import Decimal from "decimal.js"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as winstonLogger } from "winston"
import { RpcExecutorService } from "@modules/blockchains"
import { RpcAccessType } from "@modules/filesystem"
import { envConfig } from "@modules/env"
import { PrivySignService } from "@modules/privy"

@Injectable()
export class SolanaBalanceService implements IBalanceService {
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly solanaAggregatorSelectorService: SolanaAggregatorSelectorService,
        private readonly ensureMathService: EnsureMathService,
        private readonly signerService: SignerService,
        private readonly privySignService: PrivySignService,
        @InjectWinston()
        private readonly logger: winstonLogger,
    ) { }

    public async fetchBalance(
        {
            bot,
            tokenId,
        }: FetchBalanceParams
    ): Promise<FetchBalanceResponse> {
        const token = this.primaryMemoryStorageService.tokens.find(
            (token) => token.displayId === tokenId.toString()
        )
        if (!token) {
            throw new TokenNotFoundException("Token not found")
        }
        return await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Read,
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
                        const token2022 = await fetchToken2022(rpc, ataAddress)
                        return {
                            balanceAmount: new BN(token2022.data.amount.toString()),
                        }
                    } else {
                        // Standard SPL token account
                        const tokenAccount = await fetchToken(rpc, ataAddress)
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
            estimatedSwappedAmount,
        }: PrepareSwapTransactionParams
    ): Promise<PrepareSwapTransactionResponse> {
        const batchQuoteResponse = await this.solanaAggregatorSelectorService.batchQuote({
            tokenIn,
            tokenOut,
            amountIn: amountIn,
            senderAddress: bot.accountAddress,
        })
        this.ensureMathService.ensureActualNotAboveExpected({
            expected: estimatedSwappedAmount,
            actual: batchQuoteResponse.response.amountOut,
            lowerBound: new Decimal(envConfig().slippage.swap),
        })
        // we fetch the serialized transaction from the aggregator
        const { payload: serializedTransaction } = await this.solanaAggregatorSelectorService.selectorSwap({
            base: {
                payload: batchQuoteResponse.response.payload,
                tokenIn,
                tokenOut,
                accountAddress: bot.accountAddress,
            },
            aggregatorId: batchQuoteResponse.aggregatorId,
        })
        // we decode the serialized transaction
        const swapTransactionBytes = getBase64Encoder().encode(serializedTransaction as string)
        const swapTransaction = getTransactionDecoder().decode(swapTransactionBytes)
        const compiledSwapTransactionMessage = getCompiledTransactionMessageDecoder().decode(
            swapTransaction.messageBytes,
        )
        return await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Read,
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
                    createTransactionMessage({ version: 0 }),
                    (tx) => setTransactionMessageFeePayerSigner(createNoopSigner(address(bot.accountAddress)), tx),
                    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
                    (tx) => appendTransactionMessageInstructions(swapInstructions, tx),
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
                            }
                        },
                    })
                } else {
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
            isRetry,
            tokenIn,
            tokenOut,
        }: ExecuteSwapTransactionParams
    ): Promise<void> {
        if (isRetry) {
            return await this.rpcExecutorService.withSolanaRpc({
                accessType: RpcAccessType.Read,
                callback: async ({ rpc }) => {
                    const transaction = await rpc.getTransaction(signature(txHash), { commitment: "confirmed", encoding: "base58" }).send()
                    if (transaction) {
                        return
                    }
                    throw new TransactionNotExecutedException("Transaction not executed")
                },
            })
        }
        if (!solanaTx) {
            throw new Error("Solana transaction not prepared")
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
                    solanaTx, {
                        commitment: "confirmed",
                        maxRetries: BigInt(envConfig().timeConfig.retry.maxRetries),
                    })
                this.logger.verbose(
                    WinstonLog.SwapExecuted, {
                        txHash: transactionSignature.toString(),
                        bot: bot.id,
                        tokenIn,
                        tokenOut,
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

export interface ComputeTargetToQuoteSwapResponse {
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