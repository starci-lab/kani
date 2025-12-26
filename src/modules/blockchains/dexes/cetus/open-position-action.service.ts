import { Injectable } from "@nestjs/common"
import {
    IOpenActionService,
    LiquidityPoolState,
    PrepareOpenPositionParams,
    PrepareOpenPositionResponse,
} from "../../interfaces"
import { 
    ClmmPoolUtil,
    TickMath,
} from "@cetusprotocol/cetus-sui-clmm-sdk"
import { Transaction } from "@mysten/sui/transactions"
import { SignerService } from "../../signers"
import BN from "bn.js"
import { 
    PrimaryMemoryStorageService
} from "@modules/databases"
import {
    OpenPositionTxbService 
} from "./transactions"
import { 
    EnsureMathService, TickMathService 
} from "../../math"
import { 
    AmountBInBetweenExpectedException,
    InvalidPoolTokensException, 
    SnapshotBalancesNotSetException,
    TransactionEventNotFoundException,
    TransactionNotPreparedException,
    TransactionNotExecutedException,
} from "@exceptions"
import Decimal from "decimal.js"
import { ExecuteOpenPositionParams, ExecuteOpenPositionResponse } from "../../interfaces"
import { RpcExecutorService } from "../../clients"
import { RpcAccessType } from "@modules/filesystem"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { toScaledBN } from "@utils"
import { envConfig } from "@modules/env"
import { AsyncService } from "@modules/mixin"
import { SuiEvent } from "@mysten/sui/client"

@Injectable()
export class CetusOpenPositionActionService implements IOpenActionService {
    constructor(
    private readonly signerService: SignerService,
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    private readonly openPositionTxbService: OpenPositionTxbService,
    private readonly tickMathService: TickMathService,
    private readonly asyncService: AsyncService,
    private readonly rpcExecutorService: RpcExecutorService,
    private readonly ensureMathService: EnsureMathService,
    @InjectWinston()
    private readonly logger: WinstonLogger,
    ) {}

    async prepare(
        {
            bot,
            state,
        }: PrepareOpenPositionParams
    ): Promise<PrepareOpenPositionResponse> {
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
        const slippage = new Decimal(envConfig().slippage.openPosition)
        const { coinAmountB: expectedAmountB } = ClmmPoolUtil.estLiquidityAndcoinAmountFromOneAmounts(
            tickLower.toNumber(),
            tickUpper.toNumber(),
            amountA,
            true,
            false,
            slippage.toNumber(),
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
        // create the open position txb
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
        // get the tx hash
        const txHash = await openPositionTxb.getDigest()
        // return the prepare response
        return {
            txHash,
            txb: openPositionTxb,
            feeAmountA,
            feeAmountB,
            tickLower,
            tickUpper,
        }
    }
    
    async execute({
        bot,
        state,
        isRetry, // whether to retry the transaction
        txHash, // the tx hash of the open position transaction
        txb, // the txb of the open position transaction    
    }: ExecuteOpenPositionParams): Promise<ExecuteOpenPositionResponse> {
        const _state = state as LiquidityPoolState
        return await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Write,
            callback: async ({ suiClient }) => {
                return await this.signerService.withSuiSigner({
                    bot,
                    action: async (signer) => {
                        if (isRetry) {
                            const [txBlock] = await this.asyncService.resolveTuple(
                                suiClient.getTransactionBlock({
                                    digest: txHash,
                                    options: {
                                        showEvents: true,
                                    }
                                })
                            )
                            const { liquidity, positionId } = this.parseAddLiquidityEvent(txBlock?.events || [])
                            if (txBlock !== null) {
                                return {
                                    liquidity: new BN(liquidity),
                                    positionId,
                                }
                            }
                            throw new TransactionNotExecutedException("Transaction not executed")
                        }
                        if (!txb) {
                            throw new TransactionNotPreparedException("Transaction not prepared")
                        }
                        const { digest, events } = await suiClient.signAndExecuteTransaction({
                            transaction: txb,
                            signer,
                            options: {
                                showEvents: true,
                            }
                        })
                        await suiClient.waitForTransaction({
                            digest,
                        })
                        this.logger.info(
                            WinstonLog.OpenPositionExecutionSuccess, {
                                botId: bot.id,
                                txHash: digest,
                                liquidityPoolId: _state.static.displayId,
                            }
                        )
                        // parse the add liquidity event
                        const { liquidity, positionId } = this.parseAddLiquidityEvent(events || [])
                        return {
                            liquidity: new BN(liquidity),
                            positionId,
                        }
                    },
                })
            },
        })
    }

    private parseAddLiquidityEvent(
        events?: Array<SuiEvent>,
    ): {
        liquidity: string
        positionId: string
      } {
        const event = events?.find(event =>
            event.type.includes("::pool::AddLiquidityV2Event"),
        )
        if (!event) {
            throw new TransactionEventNotFoundException(
                "AddLiquidityV2Event event not found",
            )
        }
        const parsed = event.parsedJson as AddLiquidityV2Event 
        return {
            liquidity: parsed.liquidity,
            positionId: parsed.position.toString(),
        }
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
