import { Injectable } from "@nestjs/common"
import { ClosePositionParams, IActionService, LiquidityPoolState, OpenPositionParams } from "../../interfaces"
import { LiquidityMath,  SqrtPriceMath } from "@raydium-io/raydium-sdk-v2"
import { Connection } from "mongoose"
import {
    InjectPrimaryMongoose,
    LoadBalancerName,
} from "@modules/databases"
import { SignerService } from "../../signers"
import { PrimaryMemoryStorageService } from "@modules/databases"
import { 
    ActivePositionNotFoundException,
    InvalidPoolTokensException, 
    SnapshotBalancesNotSetException,
    TransactionMessageTooLargeException,
    SnapshotBalancesBeforeOpenNotSetException,
    TokenNotFoundException,
} from "@exceptions"
import { TickMathService } from "../../math"
import { 
    ClientType,  
    RpcPickerService
} from "../../clients"
import { DynamicLiquidityPoolInfo } from "../../types"
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
    BalanceService, 
} from "../../balance"
import { 
    BalanceSnapshotService, 
    ClosePositionSnapshotService, 
    OpenPositionSnapshotService, 
    SwapTransactionSnapshotService 
} from "../../snapshots"
import { 
    ClosePositionInstructionService, 
    OpenPositionInstructionService
} from "./transactions"
import { adjustSlippage } from "@utils"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as winstonLogger } from "winston"
import Decimal from "decimal.js"
import { CalculateProfitability, ProfitabilityMathService } from "../../math"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { createEventName, EventName } from "@modules/event"
import { OraClosePositionService, OraOpenTransactionService } from "@modules/ora"

@Injectable()
export class OrcaActionService implements IActionService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly signerService: SignerService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly tickMathService: TickMathService,
        private readonly balanceService: BalanceService,
        private readonly balanceSnapshotService: BalanceSnapshotService,
        private readonly openPositionSnapshotService: OpenPositionSnapshotService,
        private readonly closePositionSnapshotService: ClosePositionSnapshotService,
        private readonly profitabilityMathService: ProfitabilityMathService,
        private readonly openPositionInstructionService: OpenPositionInstructionService,
        private readonly closePositionInstructionService: ClosePositionInstructionService,
        private readonly swapTransactionSnapshotService: SwapTransactionSnapshotService,
        private readonly eventEmitter: EventEmitter2,
        private readonly rpcPickerService: RpcPickerService,
        private readonly oraOpenTransactionService: OraOpenTransactionService,
        private readonly oraClosePositionService: OraClosePositionService,
        @InjectWinston()
        private readonly logger: winstonLogger,
    ) { }

    async closePosition(
        params: ClosePositionParams
    ): Promise<void> {
        const {
            bot,
            state,
        } = params
        const _state = state as LiquidityPoolState
        if (!bot.activePosition) 
        {
            throw new ActivePositionNotFoundException(
                bot.id, 
                "Active position not found"
            )
        }
        const oraId = this.oraClosePositionService.start(bot, _state.static.displayId)
        try {
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
                oraId,
            })
            if (!shouldProceedAfterIsPositionOutOfRange) {
                return
            }
        } catch (error) {
            this.oraClosePositionService.onProcessFailure({
                id: oraId,
                bot,
                liquidityPoolId: _state.static.displayId,
            })
            throw error
        }
    }

    private async assertIsPositionOutOfRange(
        {
            bot,
            state,
            oraId
        }: ClosePositionParams & {
            oraId: string
        }
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
            oraId,
        })
        // return false to terminate the assertion
        this.eventEmitter.emit(
            createEventName(
                EventName.UpdateActiveBot, 
                {
                    botId: bot.id,
                }
            )
        )
        this.eventEmitter.emit(
            createEventName(
                EventName.PositionClosed, 
                {
                    botId: bot.id,
                }
            )
        )
        return false
    }

    private async proccessClosePositionTransaction(
        {
            bot,
            state,
            oraId,
        }: ClosePositionParams & {
            oraId: string
        }
    ): Promise<void> {
        const _state = state as LiquidityPoolState
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
        const targetIsA = bot.targetToken.toString() === state.static.tokenA.toString()
        const targetToken = targetIsA ? tokenA : tokenB
        const quoteToken = targetIsA ? tokenB : tokenA
        const txHash = await this.rpcPickerService.withSolanaRpc<string>({
            clientType: ClientType.Write,
            mainLoadBalancerName: LoadBalancerName.OrcaClmm,
            withoutRetry: true,
            callback: async ({ rpc, rpcSubscriptions }) => {
                const instructions = await this.closePositionInstructionService.createCloseInstructions({
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
                            (tx) => appendTransactionMessageInstructions(instructions, tx),
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
                        this.logger.debug(
                            WinstonLog.ClosePositionSuccess, {
                                txHash: transactionSignature.toString(),
                                bot: bot.id,
                                liquidityPoolId: _state.static.displayId,
                            })
                        return transactionSignature.toString()
                    },
                })
            },
        })
        this.oraClosePositionService.onTxSuccess({
            id: oraId,
            txHash,
        })

        const {
            balancesSnapshotsParams,
            swapsSnapshotsParams,
        } = await this.balanceService.executeBalanceRebalancing({
            bot,
            withoutSnapshot: true,
        })
        this.oraClosePositionService.onRebalancingSuccess({
            id: oraId,
        })
        const before: CalculateProfitability = {
            targetTokenBalanceAmount: new BN(snapshotTargetBalanceAmountBeforeOpen),
            quoteTokenBalanceAmount: new BN(snapshotQuoteBalanceAmountBeforeOpen),
            gasBalanceAmount:  new BN(snapshotGasBalanceAmountBeforeOpen),
        }
        const after: CalculateProfitability = {
            targetTokenBalanceAmount: new BN(balancesSnapshotsParams?.targetBalanceAmount || 0),
            quoteTokenBalanceAmount: new BN(balancesSnapshotsParams?.quoteBalanceAmount || 0),
            gasBalanceAmount: new BN(balancesSnapshotsParams?.gasBalanceAmount || 0),
        }
        const { 
            roi, 
            pnl 
        } = await this.profitabilityMathService.calculateProfitability({
            before,
            after,
            targetTokenId: targetToken.displayId,
            quoteTokenId: quoteToken.displayId,
            chainId: bot.chainId,
        })
        this.oraClosePositionService.onProfitabilityCalculationSuccess({
            id: oraId,
            roi,
            pnl,
        })
        const session = await this.connection.startSession()
        await session.withTransaction(
            async () => {
                if (!bot.activePosition) {
                    throw new ActivePositionNotFoundException(
                        bot.id, 
                        "Active position not found"
                    )
                }
                await this.balanceSnapshotService.updateBotSnapshotBalancesRecord({
                    bot,
                    targetBalanceAmount: balancesSnapshotsParams?.targetBalanceAmount || new BN(0),
                    quoteBalanceAmount: balancesSnapshotsParams?.quoteBalanceAmount || new BN(0),
                    gasBalanceAmount: balancesSnapshotsParams?.gasBalanceAmount || new BN(0),
                    session,
                })
                await this.closePositionSnapshotService
                    .updateClosePositionTransactionRecord({
                        bot,
                        pnl,
                        roi,
                        positionId: bot.activePosition.id,
                        closeTxHash: txHash,
                        session,
                        snapshotTargetBalanceAmountAfterClose: new BN(balancesSnapshotsParams?.targetBalanceAmount || 0),
                        snapshotQuoteBalanceAmountAfterClose: new BN(balancesSnapshotsParams?.quoteBalanceAmount || 0),
                        snapshotGasBalanceAmountAfterClose: new BN(balancesSnapshotsParams?.gasBalanceAmount || 0),
                    })
                if (swapsSnapshotsParams) {
                    await this.swapTransactionSnapshotService.addSwapTransactionRecord({
                        ...swapsSnapshotsParams,
                        session,
                    })
                }
            })
        this.oraClosePositionService.onSnapshotSuccess({
            id: oraId,
        })
    }

    async openPosition(
        {
            state,
            bot,
        }: OpenPositionParams
    ): Promise<void> {
        const _state = state as LiquidityPoolState
        const oraId = this.oraOpenTransactionService.start({
            bot,
            liquidityPoolId: _state.static.displayId,
        })
        try {
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
            const snapshotTargetBalanceAmountBN = new BN(snapshotTargetBalanceAmount)
            const snapshotQuoteBalanceAmountBN = new BN(snapshotQuoteBalanceAmount)
            const snapshotGasBalanceAmountBN = new BN(snapshotGasBalanceAmount)
            // check if the tokens are in the pool
            const tokenA = this.primaryMemoryStorageService.tokens
                .find((token) => token.id === _state.static.tokenA.toString())
            const tokenB = this.primaryMemoryStorageService.tokens
                .find((token) => token.id === _state.static.tokenB.toString())
            if (!tokenA || !tokenB) {
                throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
            }
            // we define the target and quote tokens here to avoid duplicate code
            const targetToken = targetIsA ? tokenA : tokenB
            const quoteToken = targetIsA ? tokenB : tokenA
            // we log the desired amounts to the ora service
            this.oraOpenTransactionService.onDesiredAmountsCalculated({
                id: oraId,
                bot,
                targetTokenId: targetToken.displayId,
                quoteTokenId: quoteToken.displayId,
                desiredTargetAmount: snapshotTargetBalanceAmountBN,
                desiredQuoteAmount: snapshotQuoteBalanceAmountBN,
                desiredGasAmount: snapshotGasBalanceAmountBN,
            })
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
                mintKeyPair,
                ataAddress,
                instructions: openPositionInstructions,
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
                mainLoadBalancerName: LoadBalancerName.OrcaClmm,
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
                                    bot: bot.id,
                                    liquidityPoolId: _state.static.displayId,
                                })
                            return transactionSignature.toString()
                        },
                    })
                },
            })
            this.oraOpenTransactionService.onTxSuccess({
                id: oraId,
                txHash,
            })
            // we refetch the balances after the position is opened
            const {
                targetBalanceAmount,
                quoteBalanceAmount,
                gasBalanceAmount,
            } = await this.balanceService.fetchBalances({
                bot,
            })
            this.oraOpenTransactionService.onBalancesRefetched({
                id: oraId,
            })
            // update the snapshot balances
            const session = await this.connection.startSession()
            await session.withTransaction(
                async () => {
                    await this.openPositionSnapshotService.addOpenPositionTransactionRecord({
                        snapshotTargetBalanceAmountBeforeOpen: snapshotTargetBalanceAmountBN,
                        snapshotQuoteBalanceAmountBeforeOpen: snapshotQuoteBalanceAmountBN,
                        snapshotGasBalanceAmountBeforeOpen: snapshotGasBalanceAmountBN,
                        liquidity: new BN(liquidity),
                        bot,
                        targetIsA,
                        tickLower: tickLower.toNumber(),
                        tickUpper: tickUpper.toNumber(),
                        chainId: bot.chainId,
                        liquidityPoolId: _state.static.displayId,
                        positionId: ataAddress.toString(),
                        openTxHash: txHash,
                        session,
                        feeAmountTarget: targetIsA ? feeAmountA : feeAmountB,
                        feeAmountQuote: targetIsA ? feeAmountB : feeAmountA,
                        metadata: {
                            nftMintAddress: mintKeyPair.address.toString(),
                        }
                    })
                    await this.balanceSnapshotService.updateBotSnapshotBalancesRecord({
                        bot,
                        targetBalanceAmount,
                        quoteBalanceAmount,
                        gasBalanceAmount,
                        session,
                    })
                })
            this.eventEmitter.emit(
                createEventName(
                    EventName.UpdateActiveBot, {
                        botId: bot.id,
                    })
            )
            this.eventEmitter.emit(
                createEventName(
                    EventName.PositionOpened, {
                        botId: bot.id,
                    })
            )
            this.oraOpenTransactionService.onSnapshotSuccess({
                id: oraId,
            })
        } catch (error) {
            this.oraOpenTransactionService.onProcessFailure({
                id: oraId,
                bot,
                liquidityPoolId: _state.static.displayId,
            })
            throw error
        }
    }
}

