import { Injectable } from "@nestjs/common"
import {
    ClosePositionParams,
    IActionService,
    LiquidityPoolState,
    OpenPositionParams,
} from "../../interfaces"
import { ClmmLiquidityMath, ClmmTickMath } from "@flowx-finance/sdk"
import { Transaction } from "@mysten/sui/transactions"
import { SignerService } from "../../signers"
import BN from "bn.js"
import {
    InjectPrimaryMongoose,
    PrimaryMemoryStorageService,
    LoadBalancerName,
} from "@modules/databases"
import {
    ClosePositionTxbService,
    OpenPositionTxbService,
} from "./transactions"
import {
    CalculateProfitability,
    ProfitabilityMathService,
    TickMathService,
} from "../../math"
import { createEventName, EventName } from "@modules/event"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { Connection } from "mongoose"
import { BalanceService } from "../../balance"
import {
    ActivePositionNotFoundException,
    InvalidPoolTokensException,
    SnapshotBalancesBeforeOpenNotSetException,
    SnapshotBalancesNotSetException,
    TokenNotFoundException,
    TransactionEventNotFoundException,
    TransactionStimulateFailedException,
} from "@exceptions"
import { DynamicLiquidityPoolInfo } from "../../types"
import {
    ClosePositionSnapshotService,
    SwapTransactionSnapshotService,
    OpenPositionSnapshotService,
    BalanceSnapshotService,
} from "../../snapshots"
import Decimal from "decimal.js"
import { ClientType, RpcPickerService } from "../../clients"
import { WinstonLog } from "@modules/winston"
import { InjectWinston } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"

@Injectable()
export class FlowXActionService implements IActionService {
    constructor(
    private readonly signerService: SignerService,
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    private readonly openPositionTxbService: OpenPositionTxbService,
    private readonly tickMathService: TickMathService,
    private readonly eventEmitter: EventEmitter2,
    @InjectPrimaryMongoose()
    private readonly connection: Connection,
    private readonly balanceService: BalanceService,
    private readonly openPositionSnapshotService: OpenPositionSnapshotService,
    private readonly balanceSnapshotService: BalanceSnapshotService,
    private readonly swapTransactionSnapshotService: SwapTransactionSnapshotService,
    private readonly closePositionSnapshotService: ClosePositionSnapshotService,
    private readonly closePositionTxbService: ClosePositionTxbService,
    private readonly profitabilityMathService: ProfitabilityMathService,
    private readonly rpcPickerService: RpcPickerService,
    @InjectWinston()
    private readonly logger: WinstonLogger,
    ) {}

    /**
   * Open LP position on FlowX CLMM
   */
    async openPosition(
        { 
            bot, 
            state 
        }: OpenPositionParams): Promise<void> {
        const _state = state as LiquidityPoolState

        const txb = new Transaction()
        if (
            !bot.snapshotTargetBalanceAmount ||
      !bot.snapshotQuoteBalanceAmount ||
      !bot.snapshotGasBalanceAmount
        ) {
            throw new SnapshotBalancesNotSetException("Snapshot balances not set")
        }
        const snapshotTargetBalanceAmountBN = new BN(
            bot.snapshotTargetBalanceAmount,
        )
        const snapshotQuoteBalanceAmountBN = new BN(bot.snapshotQuoteBalanceAmount)
        const snapshotGasBalanceAmountBN = new BN(bot.snapshotGasBalanceAmount)
        const tokenA = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === _state.static.tokenA.toString(),
        )
        const tokenB = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === _state.static.tokenB.toString(),
        )
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException(
                "Either token A or token B is not in the pool",
            )
        }
        const targetIsA = bot.targetToken.toString() === tokenA.id
        // we log the desired amounts to the ora service
        const { tickLower, tickUpper } = await this.tickMathService.getTickBounds({
            state: _state,
            bot,
        })
        const _liquidity = ClmmLiquidityMath.maxLiquidityForAmounts(
            ClmmTickMath.tickIndexToSqrtPriceX64(_state.dynamic.tickCurrent),
            ClmmTickMath.tickIndexToSqrtPriceX64(tickLower.toNumber()),
            ClmmTickMath.tickIndexToSqrtPriceX64(tickUpper.toNumber()),
            snapshotTargetBalanceAmountBN,
            snapshotQuoteBalanceAmountBN,
            true,
        )
        const {
            txb: openPositionTxb,
            feeAmountA,
            feeAmountB,
        } = await this.openPositionTxbService.createOpenPositionTxb({
            txb,
            bot,
            amountAMax: snapshotTargetBalanceAmountBN,
            amountBMax: snapshotQuoteBalanceAmountBN,
            liquidity: _liquidity,
            tickLower,
            state: _state,
            tickUpper,
        })
        const {
            digest: txHash,
            positionId,
            liquidity,
        } = await this.rpcPickerService.withSuiClient({
            clientType: ClientType.Write,
            mainLoadBalancerName: LoadBalancerName.FlowXClmm,
            // we do not proccess retries here, since we dont want to wait for the retries to complete
            withoutRetry: true,
            callback: async (client) => {
                return await this.signerService.withSuiSigner({
                    bot,
                    action: async (signer) => {
                        const stimulateTransaction =
              await client.devInspectTransactionBlock({
                  transactionBlock: openPositionTxb,
                  sender: bot.accountAddress,
              })
                        if (stimulateTransaction.effects.status.status === "failure") {
                            throw new TransactionStimulateFailedException(
                                stimulateTransaction.effects.status.error,
                            )
                        }
                        const { digest, events } = await client.signAndExecuteTransaction({
                            transaction: openPositionTxb,
                            signer,
                            options: {
                                showEvents: true,
                            },
                        })
                        const increaseLiquidityEvent = events?.find((event) =>
                            event.type.includes("::position_manager::IncreaseLiquidity"),
                        )
                        if (!increaseLiquidityEvent) {
                            throw new TransactionEventNotFoundException(
                                "IncreaseLiquidity event not found",
                            )
                        }
                        const increaseLiquidityEventParsed =
              increaseLiquidityEvent.parsedJson as IncreaseLiquidityEvent
                        const positionId = increaseLiquidityEventParsed.position_id
                        const liquidity = increaseLiquidityEventParsed.liquidity
                        // log the open position success
                        this.logger.verbose(
                            WinstonLog.OpenPositionSuccess, {
                                botId: bot.id,
                                txHash,
                                liquidityPoolId: _state.static.displayId,
                            })
                        // return the transaction hash, position id and liquidity
                        return {
                            digest,
                            positionId,
                            liquidity,
                        }
                    },
                })
            },
        })
    }

    async closePosition(
        params: ClosePositionParams
    ): Promise<void> {
        const { bot, state } = params
        const _state = state as LiquidityPoolState
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException(
                bot.id,
                "Active position not found",
            )
        }
        const targetToken = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === bot.targetToken.toString(),
        )
        if (!targetToken) {
            throw new TokenNotFoundException("Target token not found")
        }
        const quoteToken = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === bot.quoteToken.toString(),
        )
        if (!quoteToken) {
            throw new TokenNotFoundException("Quote token not found")
        }
        // we have many close criteria
        // 1. the position is out-of-range, we close immediately
        // 2. our detection find a potential dump from CEX
        // 3. the position is not profitable, we close it
        const shouldProceedAfterIsPositionOutOfRange =
      await this.assertIsPositionOutOfRange({
          bot,
          state: _state,
      })
        if (!shouldProceedAfterIsPositionOutOfRange) {
            return
        }
    }

    private async assertIsPositionOutOfRange({
        bot,
        state,
    }: ClosePositionParams): Promise<boolean> {
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException(
                bot.id,
                "Active position not found",
            )
        }
        const _state = state.dynamic as DynamicLiquidityPoolInfo
        if (
            new Decimal(_state.tickCurrent).gte(bot.activePosition.tickLower || 0) &&
      new Decimal(_state.tickCurrent).lte(bot.activePosition.tickUpper || 0)
        ) {
            // do nothing, since the position is still in the range
            // return true to continue the assertion
            return true
        }
        const tokenA = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === state.static.tokenA.toString(),
        )
        const tokenB = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === state.static.tokenB.toString(),
        )
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException(
                "Either token A or token B is not in the pool",
            )
        }
        // proccess the close position transaction
        await this.proccessClosePositionTransaction({
            bot,
            state,
        })
        // return false to terminate the assertion
        this.eventEmitter.emit(
            createEventName(EventName.UpdateActiveBot, {
                botId: bot.id,
            }),
        )
        this.eventEmitter.emit(
            createEventName(EventName.PositionClosed, {
                botId: bot.id,
            }),
        )

        return false
    }

    private async proccessClosePositionTransaction({
        bot,
        state,
    }: ClosePositionParams): Promise<void> {
        const _state = state as LiquidityPoolState
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException(
                bot.id,
                "Active position not found",
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
            throw new SnapshotBalancesBeforeOpenNotSetException(
                "Snapshot balances before open not set",
            )
        }
        // check if the tokens are in the pool
        const tokenA = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === state.static.tokenA.toString(),
        )
        const tokenB = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === state.static.tokenB.toString(),
        )
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException(
                "Either token A or token B is not in the pool",
            )
        }
        const targetIsA =
      bot.targetToken.toString() === state.static.tokenA.toString()
        const targetToken = targetIsA ? tokenA : tokenB
        const quoteToken = targetIsA ? tokenB : tokenA
        const txb = new Transaction()
        const { txb: closePositionTxb } =
      await this.closePositionTxbService.createClosePositionTxb({
          bot,
          state: _state,
          txb,
      })
        const txHash = await this.rpcPickerService.withSuiClient<string>({
            clientType: ClientType.Write,
            mainLoadBalancerName: LoadBalancerName.FlowXClmm,
            callback: async (client) => {
                // sign the transaction
                return await this.signerService.withSuiSigner({
                    bot,
                    action: async (signer) => {
                        const stimulateTransaction =
              await client.devInspectTransactionBlock({
                  transactionBlock: closePositionTxb,
                  sender: bot.accountAddress,
              })
                        if (stimulateTransaction.effects.status.status === "failure") {
                            throw new TransactionStimulateFailedException(
                                stimulateTransaction.effects.status.error,
                            )
                        }
                        const { digest } = await client.signAndExecuteTransaction({
                            transaction: closePositionTxb,
                            signer,
                            options: {
                                showEvents: true,
                            },
                        })
                        // log the close position success
                        this.logger.verbose(
                            WinstonLog.ClosePositionSuccess, {
                                botId: bot.id,
                                txHash: digest,
                                liquidityPoolId: _state.static.displayId,
                            })
                        // return the transaction hash
                        return digest
                    },
                })
            },
        })

        const { balancesSnapshotsParams, swapsSnapshotsParams } =
      await this.balanceService.executeBalanceRebalancing({
          bot,
          withoutSnapshot: true,
      })
        const before: CalculateProfitability = {
            targetTokenBalanceAmount: new BN(snapshotTargetBalanceAmountBeforeOpen),
            quoteTokenBalanceAmount: new BN(snapshotQuoteBalanceAmountBeforeOpen),
            gasBalanceAmount: new BN(snapshotGasBalanceAmountBeforeOpen),
        }
        const after: CalculateProfitability = {
            targetTokenBalanceAmount: new BN(
                balancesSnapshotsParams?.targetBalanceAmount || 0,
            ),
            quoteTokenBalanceAmount: new BN(
                balancesSnapshotsParams?.quoteBalanceAmount || 0,
            ),
            gasBalanceAmount: new BN(balancesSnapshotsParams?.gasBalanceAmount || 0),
        }
        const { roi, pnl } =
      await this.profitabilityMathService.calculateProfitability({
          before,
          after,
          targetTokenId: targetToken.displayId,
          quoteTokenId: quoteToken.displayId,
          chainId: bot.chainId,
      })
        const session = await this.connection.startSession()
        await session.withTransaction(async () => {
            if (!bot.activePosition) {
                throw new ActivePositionNotFoundException(
                    bot.id,
                    "Active position not found",
                )
            }
            await this.balanceSnapshotService.updateBotSnapshotBalancesRecord({
                bot,
                targetBalanceAmount:
          balancesSnapshotsParams?.targetBalanceAmount || new BN(0),
                quoteBalanceAmount:
          balancesSnapshotsParams?.quoteBalanceAmount || new BN(0),
                gasBalanceAmount:
          balancesSnapshotsParams?.gasBalanceAmount || new BN(0),
                session,
            })
            await this.closePositionSnapshotService.updateClosePositionTransactionRecord(
                {
                    bot,
                    pnl,
                    roi,
                    positionId: bot.activePosition.id,
                    closeTxHash: txHash,
                    session,
                    snapshotTargetBalanceAmountAfterClose: new BN(
                        balancesSnapshotsParams?.targetBalanceAmount || 0,
                    ),
                    snapshotQuoteBalanceAmountAfterClose: new BN(
                        balancesSnapshotsParams?.quoteBalanceAmount || 0,
                    ),
                    snapshotGasBalanceAmountAfterClose: new BN(
                        balancesSnapshotsParams?.gasBalanceAmount || 0,
                    ),
                },
            )
            if (swapsSnapshotsParams) {
                await this.swapTransactionSnapshotService.addSwapTransactionRecord({
                    ...swapsSnapshotsParams,
                    session,
                })
            }
        })
    }
}

interface IncreaseLiquidityEvent {
  amount_x: string;
  amount_y: string;
  liquidity: string;
  pool_id: string;
  position_id: string;
  sender: string;
}
