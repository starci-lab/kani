import { Injectable } from "@nestjs/common"
import {
    ClosePositionParams,
    IActionService,
    LiquidityPoolState,
    OpenPositionParams,
} from "../../interfaces"
import { 
    ClmmPoolUtil,
    TickMath,
} from "@cetusprotocol/cetus-sui-clmm-sdk"
import { Transaction } from "@mysten/sui/transactions"
import { SignerService } from "../../signers"
import BN from "bn.js"
import { 
    PrimaryMemoryStorageService,
    LoadBalancerName
} from "@modules/databases"
import { 
    ClosePositionTxbService, 
    OpenPositionTxbService 
} from "./transactions"
import { 
    EnsureMathService, TickMathService 
} from "../../math"
import { createEventName, EventName } from "@modules/event"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { 
    ActivePositionNotFoundException,
    AmountBInBetweenExpectedException,
    InvalidPoolTokensException, 
    SnapshotBalancesNotSetException,
    TokenNotFoundException, 
    TransactionEventNotFoundException
} from "@exceptions"
import { 
    ClosePositionConfirmationPayload, 
    DynamicLiquidityPoolInfo, 
    OpenPositionConfirmationPayload 
} from "../../types"
import Decimal from "decimal.js"
import { ClientType, RpcPickerService } from "../../clients"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { InjectQueue } from "@nestjs/bullmq"
import { bullData, BullQueueName } from "@modules/bullmq"
import { Queue } from "bullmq"
import { v4 } from "uuid"
import { getMutexKey, MutexKey, MutexService } from "@modules/lock"
import { OPEN_POSITION_SLIPPAGE } from "../constants"
import { toScaledBN } from "@utils"

@Injectable()
export class CetusActionService implements IActionService {
    constructor(
    private readonly signerService: SignerService,
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    private readonly openPositionTxbService: OpenPositionTxbService,
    private readonly tickMathService: TickMathService,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue(bullData[BullQueueName.OpenPositionConfirmation].name) 
    private openPositionConfirmationQueue: Queue<OpenPositionConfirmationPayload>,
    @InjectQueue(bullData[BullQueueName.ClosePositionConfirmation].name) 
    private closePositionConfirmationQueue: Queue<ClosePositionConfirmationPayload>,
    private readonly closePositionTxbService: ClosePositionTxbService,
    private readonly rpcPickerService: RpcPickerService,
    private readonly mutexService: MutexService,
    private readonly ensureMathService: EnsureMathService,
    @InjectWinston()
    private readonly logger: WinstonLogger,
    ) {}

    /**
     * Open LP position on Cetus CLMM
     */
    async openPosition({
        bot,
        state,
    }: OpenPositionParams): Promise<void> {
        const _state = state as LiquidityPoolState
        const txb = new Transaction()
        if (!bot.snapshotTargetBalanceAmount || !bot.snapshotQuoteBalanceAmount || !bot.snapshotGasBalanceAmount) {
            throw new SnapshotBalancesNotSetException("Snapshot balances not set")
        }
        const snapshotTargetBalanceAmountBN = new BN(bot.snapshotTargetBalanceAmount)
        const snapshotQuoteBalanceAmountBN = new BN(bot.snapshotQuoteBalanceAmount)
        const tokenA = this.primaryMemoryStorageService.tokens.find((token) => token.id === _state.static.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokens.find((token) => token.id === _state.static.tokenB.toString())
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }       
        const targetIsA = bot.targetToken.toString() === _state.static.tokenA.toString()
        const { 
            tickLower, 
            tickUpper
        } = await this.tickMathService.getTickBounds({
            state: _state,
            bot,
        })
        let amountA = targetIsA ? snapshotTargetBalanceAmountBN : snapshotQuoteBalanceAmountBN
        let amountB = targetIsA ? snapshotQuoteBalanceAmountBN : snapshotTargetBalanceAmountBN
        const { coinAmountB: expectedAmountB } = ClmmPoolUtil.estLiquidityAndcoinAmountFromOneAmounts(
            tickLower.toNumber(),
            tickUpper.toNumber(),
            amountA,
            true,
            false,
            OPEN_POSITION_SLIPPAGE.toNumber(),
            TickMath.tickIndexToSqrtPriceX64(_state.dynamic.tickCurrent),
        )
        const { isAcceptable, ratio } = this.ensureMathService.ensureBetween({
            expected: amountB,
            actual: expectedAmountB,
        })
        if (!isAcceptable) {
            throw new AmountBInBetweenExpectedException(
                ratio, 
                "Amount B is not in between expected"
            )
        }
        if (ratio.gt(new Decimal(1))) {
            amountB = new BN(expectedAmountB)
            amountA = toScaledBN(amountA, new Decimal(1).div(ratio))
        }
        const { 
            txb: openPositionTxb,
            feeAmountA,
            feeAmountB,
        } = await this.openPositionTxbService.createOpenPositionTxb({
            txb,
            bot,
            amountAMax: amountA,
            amountBMax: amountB,
            liquidity: new BN(0),
            tickLower,
            state: _state,
            tickUpper,
        })
        const { 
            digest: txHash, 
            positionId, 
            liquidity 
        } = await this.rpcPickerService.withSuiClient({
            clientType: ClientType.Write,
            mainLoadBalancerName: LoadBalancerName.CetusClmm,
            withoutRetry: true,
            callback: async (client) => {
                return await this.signerService.withSuiSigner({
                    bot,
                    action: async (signer) => {
                        const { digest, events } = await client.signAndExecuteTransaction({
                            transaction: openPositionTxb,
                            signer,
                            options: {
                                showEvents: true,
                            }
                        })
                        await client.waitForTransaction({
                            digest,
                        })
                        const addLiquidityV2Event = events?.find(
                            event => event.type.includes("::pool::AddLiquidityV2Event")
                        )
                        if (!addLiquidityV2Event) {
                            throw new TransactionEventNotFoundException("AddLiquidityV2Event event not found")
                        }
                        const addLiquidityV2EventParsed = addLiquidityV2Event.parsedJson as AddLiquidityV2Event
                        const positionId = addLiquidityV2EventParsed.position
                        const liquidity = addLiquidityV2EventParsed.liquidity
                        // log the open position success
                        this.logger.verbose(
                            WinstonLog.OpenPositionSuccess, {
                                botId: bot.id,
                                txHash: digest,
                                liquidityPoolId: _state.static.displayId,
                            })
                        return {
                            digest,
                            positionId,
                            liquidity
                        }
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
                positionId,
                liquidity: liquidity.toString(),
                feeAmountTarget: (targetIsA ? feeAmountA : feeAmountB).toString(),
                feeAmountQuote: (targetIsA ? feeAmountB : feeAmountA).toString(),
                snapshotTargetBalanceAmountBeforeOpen: bot.snapshotTargetBalanceAmount,
                snapshotQuoteBalanceAmountBeforeOpen: bot.snapshotQuoteBalanceAmount,
                snapshotGasBalanceAmountBeforeOpen: bot.snapshotGasBalanceAmount,
                tickLower: tickLower.toNumber(),
                tickUpper: tickUpper.toNumber(),
            }
        )
    }

    async closePosition(
        params: ClosePositionParams
    ): Promise<void> {
        const {
            bot,
            state,
        } = params
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
        // we have many close criteria
        // 1. the position is out-of-range, we close immediately
        // 2. our detection find a potential dump from CEX
        // 3. the position is not profitable, we close it  
        const shouldProceedAfterIsPositionOutOfRange = await this.assertIsPositionOutOfRange({
            bot,
            state: _state,
        })
        if (!shouldProceedAfterIsPositionOutOfRange) {
            // release the mutex
            mutex.release()
            // return false to terminate the assertion
            return
        }
    }

    private async assertIsPositionOutOfRange(
        {
            bot,
            state,
        }: ClosePositionParams
    ): Promise<boolean> {
        console.log("assertIsPositionOutOfRange", bot.id)
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
                EventName.UpdateActiveBot, {
                    botId: bot.id,
                })
        )
        this.eventEmitter.emit(
            createEventName(
                EventName.PositionClosed, {
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
        const txb = new Transaction()
        const {
            txb: closePositionTxb,
        } = await this.closePositionTxbService.createClosePositionTxb({
            bot,
            state: _state,
            txb,
        })
        const txHash = await this.rpcPickerService.withSuiClient<string>({
            clientType: ClientType.Write,
            mainLoadBalancerName: LoadBalancerName.CetusClmm,
            withoutRetry: true,
            callback: async (client) => {
                // sign the transaction
                return await this.signerService.withSuiSigner({
                    bot,
                    action: async (signer) => {
                        const { digest } = await client.signAndExecuteTransaction({
                            transaction: closePositionTxb,
                            signer,
                            options: {
                                showEvents: true,
                            }
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
        await this.closePositionConfirmationQueue.add(
            v4(), 
            {
                bot,
                txHash,
                state: _state,
            }
        )
    }
}

export interface AddLiquidityV2Event {
    after_liquidity: string,
    amount_a: string,
    amount_b: string,
    current_sqrt_price: string,
    liquidity: string,
    pool: string,
    position: string,
}