import { Injectable } from "@nestjs/common"
import {
    ClosePositionParams,
    ClosePositionResponse,
    CreateExecuteResponse,
    IActionService,
    LiquidityPoolState,
    OpenPositionParams,
    OpenPositionResponse,
} from "../../interfaces"
import { Transaction } from "@mysten/sui/transactions"
import { SignerService } from "../../signers"
import BN from "bn.js"
import { 
    PrimaryMemoryStorageService
} from "@modules/databases"
import { ClosePositionTxbService, OpenPositionTxbService } from "./transactions"
import { TickMathService } from "../../math"
import { 
    ActivePositionNotFoundException,
    AmountBInBetweenExpectedException,
    InvalidPoolTokensException, 
    SnapshotBalancesNotSetException,
    TokenNotFoundException, 
    TransactionEventNotFoundException,
    TransactionExecutionFailedException,
} from "@exceptions"
import { 
    DynamicLiquidityPoolInfo, 
} from "../../types"
import Decimal from "decimal.js"
import { RpcExecutorService } from "@modules/blockchains"
import { RpcAccessType } from "@modules/filesystem"
import { WinstonLog } from "@modules/winston"
import { InjectWinston } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { Network, TurbosSdk } from "turbos-clmm-sdk"
import { EnsureMathService } from "../../math"
import { toScaledBN } from "@utils"
import { AsyncService } from "@modules/mixin"
import { SuiEvent } from "@mysten/sui/client"

@Injectable()
export class TurbosActionService implements IActionService {
    constructor(
    private readonly signerService: SignerService,
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    private readonly openPositionTxbService: OpenPositionTxbService,
    private readonly tickMathService: TickMathService,
    private readonly closePositionTxbService: ClosePositionTxbService,
    private readonly asyncService: AsyncService,
    private readonly rpcExecutorService: RpcExecutorService,
    private readonly ensureMathService: EnsureMathService,
    @InjectWinston()
    private readonly logger: WinstonLogger,
    ) {}

    /**
     * Open LP position on Turbos CLMM
     */
    async openPosition({
        bot,
        state,
    }: OpenPositionParams): Promise<OpenPositionResponse> {
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
        const targetIsA = bot.targetToken.toString() === tokenA.id
        const { 
            tickLower, 
            tickUpper
        } = await this.tickMathService.getTickBounds({
            state: _state,
            bot,
        })
        let amountA = targetIsA ? snapshotTargetBalanceAmountBN : snapshotQuoteBalanceAmountBN
        let amountB = targetIsA ? snapshotQuoteBalanceAmountBN : snapshotTargetBalanceAmountBN
        const sdk = new TurbosSdk(Network.mainnet)
        const [, actualAmountB] = sdk.pool.estimateAmountsFromOneAmount({
            isAmountA: true,
            amount: amountA.toString(),
            sqrtPrice: sdk.math.tickIndexToSqrtPriceX64(new BN(_state.dynamic.tickCurrent).toNumber()).toString(),
            tickLower: tickLower.toNumber(),
            tickUpper: tickUpper.toNumber(),
        })
        const { isAcceptable, ratio } = this.ensureMathService.ensureBetween({
            expected: amountB,
            actual: new BN(actualAmountB),
        })
        if (!isAcceptable) {
            throw new AmountBInBetweenExpectedException(
                ratio, 
                "Amount B is not in between expected"
            )
        }
        if (ratio.gt(new Decimal(1))) {
            amountB = new BN(actualAmountB)
            amountA = toScaledBN(amountA, new Decimal(1).div(ratio))
        }
        const { 
            txb: openPositionTxb,
            feeAmountA,
            feeAmountB,
        } = await this.openPositionTxbService.createOpenPositionTxb({
            txb,
            bot,
            // we don't need to calculate liquidity for Turbos CLMM
            liquidity: new BN(0),
            amountAMax: amountA,
            amountBMax: amountB,
            tickLower,
            state: _state,
            tickUpper,
        })
        let txHash: string | null = null
        let execute: ((isRetry: boolean) => Promise<CreateExecuteResponse>) | null = null
        const feeAmountTarget = targetIsA ? feeAmountA : feeAmountB
        const feeAmountQuote = targetIsA ? feeAmountB : feeAmountA
        await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Write,
            callback: async ({ suiClient }) => {
                return await this.signerService.withSuiSigner({
                    bot,
                    action: async (signer) => {
                        const { digest, events } = await suiClient.signAndExecuteTransaction({
                            transaction: openPositionTxb,
                            signer,
                            options: {
                                showEvents: true,
                            }
                        })
                        txHash = digest
                        execute = async (isRetry: boolean): Promise<CreateExecuteResponse> => {
                            if (isRetry) {
                                const [txBlock] = await this.asyncService.resolveTuple(
                                    suiClient.getTransactionBlock({
                                        digest,
                                        options: {
                                            showEvents: true,
                                        }
                                    })
                                )
                                if (txBlock !== null) {
                                    const { liquidity, positionId } = this.parseMintEvents(txBlock?.events || [])
                                    return {
                                        metadata: {
                                            liquidity: liquidity.toString(),
                                        },
                                        feeAmountTarget,
                                        feeAmountQuote,
                                        positionId,
                                    }
                                }
                            }
                            await suiClient.waitForTransaction({
                                digest,
                            })
                            const { liquidity, positionId } = this.parseMintEvents(events || [])
                            // log the open position success
                            this.logger.verbose(
                                WinstonLog.OpenPositionSuccess, {
                                    botId: bot.id,
                                    txHash: digest,
                                    liquidityPoolId: _state.static.displayId,
                                })
                            return {
                                metadata: {
                                    liquidity: liquidity.toString(),
                                },
                                feeAmountTarget,
                                feeAmountQuote,
                                positionId,
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
        const txb = new Transaction()
        const {
            txb: closePositionTxb,
        } = await this.closePositionTxbService.createClosePositionTxb({
            bot,
            state: _state,
            txb,
        })
        let txHash: string | null = null
        let execute: ((isRetry: boolean) => Promise<void>) | null = null
        await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Write,
            callback: async ({ suiClient }) => {
                // sign the transaction
                return await this.signerService.withSuiSigner({
                    bot,
                    action: async (signer) => {
                        const { digest } = await suiClient.signAndExecuteTransaction({
                            transaction: closePositionTxb,
                            signer,
                            options: {
                                showEvents: true,
                            }
                        })
                        txHash = digest
                        execute = async (isRetry: boolean) => {
                            if (isRetry) {
                                const [txBlock] = await this.asyncService.resolveTuple(
                                    suiClient.getTransactionBlock({
                                        digest,
                                        options: {
                                            showEvents: true,
                                        }
                                    })
                                )
                                if (txBlock !== null) {
                                    return
                                }
                            }
                            await suiClient.waitForTransaction({
                                digest
                            })
                            // log the close position success
                            this.logger.verbose(
                                WinstonLog.ClosePositionSuccess, {
                                    botId: bot.id,
                                    txHash: txHash,
                                    liquidityPoolId: _state.static.displayId,
                                }
                            )
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

    private parseMintEvents(
        events?: Array<SuiEvent>,
    ): {
        liquidity: BN
        positionId: string
    } {
        const mintNftEvent = events?.find(
            event => event.type.includes("position_manager::MintNftEvent")
        )
        if (!mintNftEvent) {
            throw new TransactionEventNotFoundException("MintNft event not found")
        }
        const mintNftEventParsed = mintNftEvent.parsedJson as MintNftEvent
        const positionId = mintNftEventParsed.nft_address
        const mintEvent = events?.find(
            event => event.type.includes("pool::MintEvent")
        )
        if (!mintEvent) {
            throw new TransactionEventNotFoundException("Mint event not found")
        }
        const mintEventParsed = mintEvent.parsedJson as MintEvent
        const liquidity = new BN(mintEventParsed.liquidity_delta)
        return {
            liquidity,
            positionId,
        }
    }
}

interface MintNftEvent {
    nft_address: string;
    pool_id: string;
    position_id: string;
}

interface MintEvent {
    amount_a: string;
    amount_b: string;
    liquidity_delta: string;
    owner: string;
    pool: string;
}
