import { Injectable } from "@nestjs/common"
import { 
    ClosePositionParams, 
    ClosePositionResponse, 
    CreateExecuteResponse,
    IActionService, 
    LiquidityPoolState, 
    OpenPositionParams,
    OpenPositionResponse
} from "../../interfaces"
import { LiquidityMath,  SqrtPriceMath } from "@raydium-io/raydium-sdk-v2"
import { SignerService } from "../../signers"
import { PrimaryMemoryStorageService } from "@modules/databases"
import { 
    ActivePositionNotFoundException,
    InvalidPoolTokensException, 
    SnapshotBalancesNotSetException,
    TransactionMessageTooLargeException,
    TokenNotFoundException,
    TransactionExecutionFailedException,
} from "@exceptions"
import { TickMathService } from "../../math"
import { 
    DynamicLiquidityPoolInfo, 
} from "../../types"
import { 
    signTransaction,
    pipe,
    addSignersToTransactionMessage,
    setTransactionMessageFeePayerSigner,
    setTransactionMessageLifetimeUsingBlockhash,
    isTransactionMessageWithinSizeLimit,
    compileTransaction,
    assertIsSendableTransaction,
    assertIsTransactionWithinSizeLimit,
    sendAndConfirmTransactionFactory,
    getSignatureFromTransaction,
    createTransactionMessage,
    appendTransactionMessageInstructions,
} from "@solana/kit"
import BN from "bn.js"
import { 
    ClosePositionInstructionService, 
    OpenPositionInstructionService 
} from "./transactions"
import { adjustSlippage } from "@utils"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import Decimal from "decimal.js"
import { RpcExecutorService } from "@modules/blockchains"
import { RpcAccessType } from "@modules/filesystem"
import { envConfig } from "@modules/env"

@Injectable()
export class RaydiumActionService implements IActionService {
    constructor(
        private readonly signerService: SignerService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly tickMathService: TickMathService,
        private readonly openPositionInstructionService: OpenPositionInstructionService,
        private readonly closePositionInstructionService: ClosePositionInstructionService,
        private readonly rpcExecutorService: RpcExecutorService,
        @InjectWinston()
        private readonly logger: WinstonLogger,
    ) { }

    async closePosition(
        { bot, state }: ClosePositionParams
    ): Promise<ClosePositionResponse | null> {  
        const _state = state as LiquidityPoolState
        if (!bot.activePosition) 
        {
            throw new ActivePositionNotFoundException(
                bot.id, 
                "Active position not found"
            )
        }
        const targetToken = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === bot.targetToken.toString()
        )
        if (!targetToken) {
            throw new TokenNotFoundException("Target token not found")
        }
        const quoteToken = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === bot.quoteToken.toString()
        )
        if (!quoteToken) {
            throw new TokenNotFoundException("Quote token not found")
        }
        // we have many close conditions
        // 1. the position is out-of-range, we close immediately
        // 2. our detection find a potential dump from CEX
        // 3. the position is not profitable, we close it  
        const shouldProceedAfterIsPositionOutOfRange = await this.assertIsPositionOutOfRange({
            bot,
            state: _state,
        })
        if (shouldProceedAfterIsPositionOutOfRange) {
            return shouldProceedAfterIsPositionOutOfRange
        }
        return null
    }

    private async assertIsPositionOutOfRange(
        {
            bot,
            state,
        }: ClosePositionParams
    ): Promise<ClosePositionResponse | null> {
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException(
                bot.id, 
                "Active position not found"
            )
        }
        const _state = state.dynamic as DynamicLiquidityPoolInfo
        if (
            new Decimal(_state.tickCurrent).gte(bot.activePosition.tickLower || 0) 
            && new Decimal(_state.tickCurrent).lte(bot.activePosition.tickUpper || 0)
        ) {
            // do nothing, since the position is still in the range
            // return null to continue the assertion
            return null
        }
        const tokenA = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === state.static.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === state.static.tokenB.toString())
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
        return await this.proccessClosePositionTransaction({
            bot,
            state,
        })
    }

    private async proccessClosePositionTransaction(
        {
            bot,
            state,
        }: ClosePositionParams
    ): Promise<ClosePositionResponse> {
        const _state = state as LiquidityPoolState
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException(
                bot.id, 
                "Active position not found"
            )
        }
        // check if the tokens are in the pool
        const tokenA = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === state.static.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === state.static.tokenB.toString())
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
        let txHash: string | null = null
        let execute: ((isRetry: boolean) => Promise<void>) | null = null
        await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Write,
            callback: async ({ rpc, rpcSubscriptions }) => {
                const closePositionInstructions = await this.closePositionInstructionService.createCloseInstructions({
                    bot,
                    state: _state,
                })
                // sign the transaction
                return await this.signerService.withSolanaSigner({
                    bot,
                    action: async (signer) => {
                        const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
                        const transactionMessage = pipe(
                            createTransactionMessage({ version: 0 }),
                            (tx) => addSignersToTransactionMessage([signer], tx),
                            (tx) => setTransactionMessageFeePayerSigner(signer, tx),
                            (tx) => appendTransactionMessageInstructions(closePositionInstructions, tx),
                            (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
                        )
                        if (!isTransactionMessageWithinSizeLimit(transactionMessage)) {
                            throw new TransactionMessageTooLargeException("Transaction message is too large")
                        }
                        const transaction = compileTransaction(transactionMessage)
                        const signedTransaction = await signTransaction(
                            [signer.keyPair],
                            transaction,
                        )
                        assertIsSendableTransaction(signedTransaction)
                        assertIsTransactionWithinSizeLimit(signedTransaction)
                        const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
                            rpc,
                            rpcSubscriptions,
                        })
                        const transactionSignature = getSignatureFromTransaction(signedTransaction)
                        txHash = transactionSignature.toString()
                        execute = async (isRetry: boolean) => {
                            if (isRetry) {
                                const transactionExisted = await rpc.getTransaction(transactionSignature).send()
                                if (transactionExisted) {
                                    return
                                }
                            }
                            await sendAndConfirmTransaction(
                                signedTransaction, {
                                    commitment: "confirmed",
                                    maxRetries: BigInt(envConfig().timeConfig.retry.maxRetries),
                                })
                            this.logger.verbose(
                                WinstonLog.ClosePositionSuccess, {
                                    txHash: transactionSignature.toString(),
                                    botId: bot.id,
                                    liquidityPoolId: _state.static.displayId,
                                }
                            )
                        }
                    },
                },
                )
            },
        })
        if (!txHash || !execute) {
            throw new TransactionExecutionFailedException("Transaction execution failed")
        }
        return {
            txHash,
            execute,
        }
    }

    async openPosition(
        {
            state,
            bot,
        }: OpenPositionParams
    ): Promise<OpenPositionResponse> {
        const _state = state as LiquidityPoolState
        const slippage = new Decimal(envConfig().slippage.openPosition)
        const targetIsA = bot.targetToken.toString() === _state.static.tokenA.toString()
        const {
            snapshotTargetBalanceAmount,
            snapshotQuoteBalanceAmount,
            snapshotGasBalanceAmount,
        } = bot
        if (!snapshotTargetBalanceAmount || !snapshotQuoteBalanceAmount || !snapshotGasBalanceAmount) {
            throw new SnapshotBalancesNotSetException("Snapshot balances not set")
        }
        // check if the tokens are in the pool
        const tokenA = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === _state.static.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === _state.static.tokenB.toString())
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
        // get the tick bounds
        const { 
            tickLower, 
            tickUpper
        } = await this.tickMathService.getTickBounds({
            state: _state,
            bot,
        })
        const sqrtPriceCurrentX64 = SqrtPriceMath.getSqrtPriceX64FromTick(
            _state.dynamic.tickCurrent,
        )
        const sqrtPriceLowerX64 = SqrtPriceMath.getSqrtPriceX64FromTick(
            tickLower.toNumber(),
        )
        const sqrtPriceUpperX64 = SqrtPriceMath.getSqrtPriceX64FromTick(
            tickUpper.toNumber(),
        )
        const amountA = targetIsA ? new BN(snapshotTargetBalanceAmount) : new BN(snapshotQuoteBalanceAmount)
        const amountB = targetIsA ? new BN(snapshotQuoteBalanceAmount) : new BN(snapshotTargetBalanceAmount)
        const liquidityRaw = 
                LiquidityMath.getLiquidityFromTokenAmounts(
                    sqrtPriceCurrentX64,
                    sqrtPriceLowerX64,
                    sqrtPriceUpperX64,
                    amountA,
                    amountB,
                )
        const liquidity = adjustSlippage(
            liquidityRaw,
            slippage,
        )
        // open the position
        const {
            instructions: openPositionInstructions,
            mintKeyPair,
            ataAddress,
            feeAmountA,
            feeAmountB,
        } = await this.openPositionInstructionService.createOpenPositionInstructions({
            bot,
            state: _state,
            liquidity,
            amountAMax: amountA,
            amountBMax: amountB,
            tickLower,
            tickUpper,
        })
        // convert the transaction to a transaction with lifetime
        // sign the transaction
        let txHash: string | null = null
        let execute: ((isRetry: boolean) => Promise<CreateExecuteResponse>) | null = null
        const feeAmountTarget = targetIsA ? feeAmountA : feeAmountB
        const feeAmountQuote = targetIsA ? feeAmountB : feeAmountA
        await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Write,
            callback: async ({ rpc, rpcSubscriptions }) => {
                return await this.signerService.withSolanaSigner({
                    bot,
                    action: async (signer) => {
                        const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
                        const transactionMessage = pipe(
                            createTransactionMessage({ version: 0 }),
                            (tx) => addSignersToTransactionMessage([signer, mintKeyPair], tx),
                            (tx) => setTransactionMessageFeePayerSigner(signer, tx),
                            (tx) => appendTransactionMessageInstructions(openPositionInstructions, tx),
                            (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
                        )
                        if (!isTransactionMessageWithinSizeLimit(transactionMessage)) {
                            throw new TransactionMessageTooLargeException("Transaction message is too large")
                        }
                        const transaction = compileTransaction(transactionMessage)
                        // sign the transaction
                        const signedTransaction = await signTransaction(
                            [signer.keyPair, mintKeyPair.keyPair],
                            transaction,
                        )
                        assertIsSendableTransaction(signedTransaction)
                        assertIsTransactionWithinSizeLimit(signedTransaction)
                        const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
                            rpc,
                            rpcSubscriptions,
                        })
                        const transactionSignature = getSignatureFromTransaction(signedTransaction)
                        txHash = transactionSignature.toString()
                        const response: CreateExecuteResponse = {
                            metadata: {
                                nftMintAddress: mintKeyPair.address.toString(),
                            },
                            feeAmountTarget,
                            feeAmountQuote,
                            positionId: ataAddress.toString(),
                        }
                        execute = async (isRetry: boolean): Promise<CreateExecuteResponse> => {
                            if (isRetry) {
                                const transactionExisted = await rpc.getTransaction(transactionSignature).send()
                                if (transactionExisted) {
                                    return response
                                }
                            }
                            await sendAndConfirmTransaction(
                                signedTransaction, {
                                    commitment: "confirmed",
                                    maxRetries: BigInt(envConfig().timeConfig.retry.maxRetries),
                                })
                            this.logger.verbose(
                                WinstonLog.OpenPositionSuccess, {
                                    txHash: transactionSignature.toString(),
                                    botId: bot.id,
                                    liquidityPoolId: _state.static.displayId,
                                })
                            return response
                        }
                    },
                })
            },
        })
        if (!txHash || !execute) {
            throw new TransactionExecutionFailedException("Transaction execution failed")
        }
        return {
            txHash,
            execute,
        }
    }
}
