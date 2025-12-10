import { Injectable } from "@nestjs/common"
import { 
    ClosePositionParams, 
    IActionService, 
    LiquidityPoolState, 
    OpenPositionParams 
} from "../../interfaces"
import { LiquidityMath,  SqrtPriceMath } from "@raydium-io/raydium-sdk-v2"
import {
    LoadBalancerName,
} from "@modules/databases"
import { SignerService } from "../../signers"
import { PrimaryMemoryStorageService } from "@modules/databases"
import { 
    ActivePositionNotFoundException,
    InvalidPoolTokensException, 
    SnapshotBalancesNotSetException,
    TransactionMessageTooLargeException,
    TokenNotFoundException,
} from "@exceptions"
import { TickMathService } from "../../math"
import { 
    ClosePositionConfirmationPayload, 
    DynamicLiquidityPoolInfo, 
    OpenPositionConfirmationPayload 
} from "../../types"
import { OPEN_POSITION_SLIPPAGE } from "../constants"
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
import { EventEmitter2 } from "@nestjs/event-emitter"
import { createEventName, EventName } from "@modules/event"
import { ClientType, RpcPickerService } from "../../clients"
import { InjectQueue } from "@nestjs/bullmq"
import { bullData, BullQueueName } from "@modules/bullmq"
import { Queue } from "bullmq"
import { v4 } from "uuid"
import { getMutexKey, MutexKey, MutexService } from "@modules/lock"

@Injectable()
export class RaydiumActionService implements IActionService {
    constructor(
        private readonly signerService: SignerService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly tickMathService: TickMathService,
        private readonly openPositionInstructionService: OpenPositionInstructionService,
        private readonly closePositionInstructionService: ClosePositionInstructionService,
        @InjectQueue(bullData[BullQueueName.OpenPositionConfirmation].name) 
        private openPositionConfirmationQueue: Queue<OpenPositionConfirmationPayload>,
        @InjectQueue(bullData[BullQueueName.ClosePositionConfirmation].name) 
        private closePositionConfirmationQueue: Queue<ClosePositionConfirmationPayload>,
        private readonly eventEmitter: EventEmitter2,
        private readonly rpcPickerService: RpcPickerService,
        private readonly mutexService: MutexService,
        @InjectWinston()
        private readonly logger: WinstonLogger,
    ) { }

    async closePosition(
        { bot, state }: ClosePositionParams
    ): Promise<void> {
        const mutex = this.mutexService.mutex(getMutexKey(MutexKey.Action, bot.id))
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
        if (!shouldProceedAfterIsPositionOutOfRange) {
            mutex.release()
            return
        }
    }

    private async assertIsPositionOutOfRange(
        {
            bot,
            state,
        }: ClosePositionParams
    ): Promise<boolean> {
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
            // return true to continue the assertion
            return true
        }
        const tokenA = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === state.static.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === state.static.tokenB.toString())
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
        await this.proccessClosePositionTransaction({
            bot,
            state,
        })
        // return false to terminate the assertion
        this.eventEmitter.emit(
            createEventName(
                EventName.UpdateActiveBot, 
                {
                    botId: bot.id,
                })
        )
        this.eventEmitter.emit(
            createEventName(
                EventName.PositionClosed, 
                {
                    botId: bot.id,
                })
        )
        return false
    }

    private async proccessClosePositionTransaction(
        {
            bot,
            state,
        }: ClosePositionParams
    ): Promise<void> {
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
        const closePositionInstructions = await this.closePositionInstructionService.createCloseInstructions({
            bot,
            state: _state,
        })
        const txHash = await this.rpcPickerService.withSolanaRpc<string>({
            clientType: ClientType.Write,
            mainLoadBalancerName: LoadBalancerName.RaydiumClmm,
            withoutRetry: true,
            callback: async ({ rpc, rpcSubscriptions }) => {
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
                        await sendAndConfirmTransaction(
                            signedTransaction, {
                                commitment: "confirmed",
                                maxRetries: BigInt(5),
                            })
                        return transactionSignature.toString()
                    },
                })
            },
        })
        this.logger.verbose(
            WinstonLog.ClosePositionSuccess, {
                txHash,
                botId: bot.id,
                liquidityPoolId: _state.static.displayId,
            })
        await this.closePositionConfirmationQueue.add(
            v4(), 
            {
                bot,
                txHash,
                state: _state,
            }
        )
    }

    async openPosition(
        {
            state,
            bot,
        }: OpenPositionParams
    ): Promise<void> {
        const _state = state as LiquidityPoolState
        const slippage = OPEN_POSITION_SLIPPAGE
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
        const txHash = await this.rpcPickerService.withSolanaRpc<string>({
            clientType: ClientType.Write,
            mainLoadBalancerName: LoadBalancerName.RaydiumClmm,
            withoutRetry: true,
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
                        await sendAndConfirmTransaction(
                            signedTransaction, {
                                commitment: "confirmed",
                                maxRetries: BigInt(5),
                            })
                        this.logger.verbose(
                            WinstonLog.OpenPositionSuccess, {
                                txHash: transactionSignature.toString(),
                                botId: bot.id,
                                liquidityPoolId: _state.static.displayId,
                            })
                        return transactionSignature.toString()
                    },
                })
            },
        })
        // Enqueue the job to be processed by the worker.
        // Logic is no longer executed immediately here.
        // Using the worker ensures reliable and asynchronous processing.
        await this.openPositionConfirmationQueue.add(
            v4(), 
            {
                bot,
                txHash,
                state: _state,
                positionId: ataAddress.toString(),
                liquidity: liquidity.toString(),
                feeAmountTarget: (targetIsA ? feeAmountA : feeAmountB).toString(),
                feeAmountQuote: (targetIsA ? feeAmountB : feeAmountA).toString(),
                snapshotTargetBalanceAmountBeforeOpen: bot.snapshotTargetBalanceAmount!,
                snapshotQuoteBalanceAmountBeforeOpen: bot.snapshotQuoteBalanceAmount!,
                snapshotGasBalanceAmountBeforeOpen: bot.snapshotGasBalanceAmount!,
                tickLower: tickLower.toNumber(),
                tickUpper: tickUpper.toNumber(),
            }
        )
    }
}

