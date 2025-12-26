import { Injectable } from "@nestjs/common"
import {
    ExecuteClosePositionParams,
    IClosePositionActionService,
    DlmmLiquidityPoolState,
    PrepareClosePositionParams,
    PrepareClosePositionResponse,
} from "../../interfaces"
import { SignerService } from "../../signers"
import { 
    PrimaryMemoryStorageService
} from "@modules/databases"
import { ClosePositionInstructionService } from "./transactions"
import { 
    ActivePositionNotFoundException,
    InvalidPoolTokensException,
    SnapshotBalancesBeforeOpenNotSetException,
    TokenNotFoundException, 
    TransactionMessageTooLargeException,
    TransactionNotPreparedException,
} from "@exceptions"
import { RpcExecutorService } from "../../clients"
import { RpcAccessType } from "@modules/filesystem"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import Decimal from "decimal.js"
import {
    DynamicDlmmLiquidityPoolInfo,
} from "../../types"
import { 
    pipe,
    addSignersToTransactionMessage,
    setTransactionMessageFeePayerSigner,
    setTransactionMessageLifetimeUsingBlockhash,
    isTransactionMessageWithinSizeLimit,
    compileTransaction,
    getSignatureFromTransaction,
    createTransactionMessage,
    appendTransactionMessageInstructions,
    sendAndConfirmTransactionFactory,
    signature,
    assertIsSendableTransaction,
    assertIsTransactionWithinSizeLimit,
} from "@solana/kit"
import { envConfig } from "@modules/env"

@Injectable()
export class MeteoraClosePositionActionService implements IClosePositionActionService {
    constructor(
        private readonly closePositionInstructionService: ClosePositionInstructionService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly signerService: SignerService,
        private readonly rpcExecutorService: RpcExecutorService,
        @InjectWinston()
        private readonly logger: WinstonLogger,
    ) { }

    async prepare(
        { bot, state }: PrepareClosePositionParams
    ): Promise<PrepareClosePositionResponse> {
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
        const tokenA = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === state.static.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === state.static.tokenB.toString())
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
        return await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Write,
            callback: async ({ rpc }) => {
                const closePositionInstructions = await this.closePositionInstructionService.createCloseInstructions({
                    bot,
                    state: _state,
                })
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
                        const transactionSignature = getSignatureFromTransaction(transaction)
                        const txHash = transactionSignature.toString()
                        assertIsSendableTransaction(transaction)
                        assertIsTransactionWithinSizeLimit(transaction)
                        return {
                            txHash,
                            solanaTx: transaction,
                        }
                    },
                })
            },
        })
    }

    async execute(
        params: ExecuteClosePositionParams
    ): Promise<void> {
        const { bot } = params
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
        const shouldProceedAfterIsPositionOutOfRange = await this.assertIsPositionOutOfRange(params)
        if (shouldProceedAfterIsPositionOutOfRange) {
            return
        }
    }

    private async assertIsPositionOutOfRange(
        params: ExecuteClosePositionParams
    ): Promise<boolean> {
        const { state, bot } = params
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
            return false
        }
        const tokenA = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === state.static.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === state.static.tokenB.toString())
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
        await this.proccessClosePositionTransaction(params)
        return true
    }

    private async proccessClosePositionTransaction(
        {
            bot,
            state,
            isRetry,
            solanaTx,
            txHash,
        }: ExecuteClosePositionParams
    ): Promise<void> {
        const _state = state as DlmmLiquidityPoolState
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException(
                bot.id,
                "Active position not found"
            )
        }
        const tokenA = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === state.static.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === state.static.tokenB.toString())
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
        await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Write,
            callback: async ({ rpc, rpcSubscriptions }) => { 
                if (isRetry) {
                    const transactionExisted = await rpc.getTransaction(
                        signature(txHash), 
                        { commitment: "confirmed", encoding: "base58" }
                    ).send()
                    if (transactionExisted) {
                        return
                    }
                }
                if (!solanaTx) {
                    throw new TransactionNotPreparedException("Transaction not prepared")
                }
                const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
                    rpc,
                    rpcSubscriptions,
                })
                await sendAndConfirmTransaction(
                    solanaTx, {
                        commitment: "confirmed",
                        maxRetries: BigInt(envConfig().timeConfig.retry.maxRetries),
                    })
                this.logger.verbose(
                    WinstonLog.ClosePositionSuccess, {
                        botId: bot.id,
                        txHash,
                        liquidityPoolId: _state.static.displayId,
                    }
                )
            },
        })
    }
}

