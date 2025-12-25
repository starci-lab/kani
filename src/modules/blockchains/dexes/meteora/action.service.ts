import { Injectable } from "@nestjs/common"
import { 
    ClosePositionParams, 
    ClosePositionResponse,
    CreateExecuteResponse,
    DlmmLiquidityPoolState, 
    IActionService, 
    OpenPositionParams,
    OpenPositionResponse
} from "../../interfaces"
import { ClosePositionInstructionService, OpenPositionInstructionService } from "./transactions"
import BN from "bn.js"
import {
    ActivePositionNotFoundException,
    InvalidPoolTokensException,
    SnapshotBalancesBeforeOpenNotSetException,
    SnapshotBalancesNotSetException,
    TokenNotFoundException,
    TransactionMessageTooLargeException,
    TransactionExecutionFailedException,
} from "@exceptions"
import { SignerService } from "../../signers"
import {
    addSignersToTransactionMessage,
    appendTransactionMessageInstructions,
    compileTransaction,
    pipe,
    setTransactionMessageFeePayerSigner,
    setTransactionMessageLifetimeUsingBlockhash,
    signTransaction,
    createTransactionMessage,
    isTransactionMessageWithinSizeLimit,
    sendAndConfirmTransactionFactory,
    assertIsSendableTransaction,
    assertIsTransactionWithinSizeLimit,
    getSignatureFromTransaction,
} from "@solana/kit"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import {
    PrimaryMemoryStorageService
} from "@modules/databases"
import { RpcExecutorService } from "@modules/blockchains"
import { RpcAccessType } from "@modules/filesystem"
import Decimal from "decimal.js"
import { 
    DynamicDlmmLiquidityPoolInfo, 
} from "../../types"

@Injectable()
export class MeteoraActionService implements IActionService {
    constructor(
        private readonly openPositionInstructionService: OpenPositionInstructionService,
        private readonly closePositionInstructionService: ClosePositionInstructionService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly signerService: SignerService,
        private readonly rpcExecutorService: RpcExecutorService,
        @InjectWinston()
        private readonly logger: WinstonLogger,
    ) { }
    
    async openPosition({
        state,
        bot,
    }: OpenPositionParams): Promise<OpenPositionResponse> {
        const _state = state as DlmmLiquidityPoolState
        const targetIsA = bot.targetToken.toString() === _state.static.tokenA.toString()
        const {
            snapshotTargetBalanceAmount,
            snapshotQuoteBalanceAmount,
            snapshotGasBalanceAmount,
        } = bot
        if (
            !snapshotTargetBalanceAmount ||
                !snapshotQuoteBalanceAmount ||
                !snapshotGasBalanceAmount
        ) {
            throw new SnapshotBalancesNotSetException("Snapshot balances not set")
        }
        const tokenA = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === _state.static.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === _state.static.tokenB.toString())
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
        const amountA = targetIsA ? new BN(snapshotTargetBalanceAmount) : new BN(snapshotQuoteBalanceAmount)
        const amountB = targetIsA ? new BN(snapshotQuoteBalanceAmount) : new BN(snapshotTargetBalanceAmount)
        // open the position
        const {
            instructions: openPositionInstructions,
            positionKeyPair,
            minBinId,
            maxBinId,
            feeAmountA,
            feeAmountB,
        } = await this.openPositionInstructionService.createOpenPositionInstructions({
            bot,
            state: _state,
            amountA,
            amountB,
        })
        // convert the transaction to a transaction with lifetime
        // sign the transaction
        let txHash: string | null = null
        let execute: (() => Promise<CreateExecuteResponse>) | null = null
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
                            (tx) => addSignersToTransactionMessage([signer, positionKeyPair], tx),
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
                            [signer.keyPair, positionKeyPair.keyPair],
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
                        execute = async (): Promise<CreateExecuteResponse> => {
                            await sendAndConfirmTransaction(
                                signedTransaction, {
                                    commitment: "confirmed",
                                    maxRetries: BigInt(5)
                                })
                            this.logger.verbose(
                                WinstonLog.OpenPositionSuccess, {
                                    txHash: transactionSignature.toString(),
                                    botId: bot.id,
                                    liquidityPoolId: _state.static.displayId,
                                })
                            return {
                                metadata: {
                                    minBinId: minBinId.toNumber(),
                                    maxBinId: maxBinId.toNumber(),
                                    amountA: amountA.toString(),
                                    amountB: amountB.toString(),
                                },
                                feeAmountTarget,
                                feeAmountQuote,
                                positionId: positionKeyPair.address.toString(),
                            }
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

    async closePosition(
        { bot, state }: ClosePositionParams
    ): Promise<ClosePositionResponse | null> {  
        const _state = state as DlmmLiquidityPoolState
        if (!bot.activePosition) {
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
        // we have many close criteria
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
        const _state = state.dynamic as DynamicDlmmLiquidityPoolInfo
        if (
            new Decimal(_state.activeId || 0).gte(bot.activePosition.minBinId || 0) 
            && new Decimal(_state.activeId || 0).lte(bot.activePosition.maxBinId || 0)
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
        const _state = state as DlmmLiquidityPoolState
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException(
                bot.id,
                "Active position not found"
            )
        }
        const {
            snapshotTargetBalanceAmountBeforeOpen,
            snapshotQuoteBalanceAmountBeforeOpen,
            snapshotGasBalanceAmountBeforeOpen,
        } = bot.activePosition
        if (
            !snapshotTargetBalanceAmountBeforeOpen ||
            !snapshotQuoteBalanceAmountBeforeOpen ||
            !snapshotGasBalanceAmountBeforeOpen
        ) {
            throw new SnapshotBalancesBeforeOpenNotSetException("Snapshot balances before open not set")
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
        let execute: (() => Promise<void>) | null = null
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
                        // sign the transaction
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
                        execute = async () => {
                            await sendAndConfirmTransaction(
                                signedTransaction, {
                                    commitment: "confirmed",
                                    maxRetries: BigInt(5),
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
}
