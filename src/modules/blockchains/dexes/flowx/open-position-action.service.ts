import { Injectable } from "@nestjs/common"
import {
    IOpenActionService,
    LiquidityPoolState,
    PrepareOpenPositionParams,
    PrepareOpenPositionResponse,
    ExecuteOpenPositionParams,
    ExecuteOpenPositionResponse,
} from "../../interfaces"
import { Transaction } from "@mysten/sui/transactions"
import { SignerService } from "../../signers"
import BN from "bn.js"
import {
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    OpenPositionTxbService,
} from "./transactions"
import {
    TickMathService,
} from "../../math"
import {
    InvalidPoolTokensException,
    SnapshotBalancesNotSetException,
    TransactionEventNotFoundException,
    TransactionNotPreparedException,
    TransactionNotExecutedException,
} from "@exceptions"
import { RpcExecutorService } from "../../clients"
import { RpcAccessType } from "@modules/filesystem"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { AsyncService } from "@modules/mixin"
import { SuiEvent } from "@mysten/sui/client"

@Injectable()
export class FlowXOpenPositionActionService implements IOpenActionService {
    constructor(
        private readonly signerService: SignerService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly openPositionTxbService: OpenPositionTxbService,
        private readonly tickMathService: TickMathService,
        private readonly asyncService: AsyncService,
        private readonly rpcExecutorService: RpcExecutorService,
        @InjectWinston()
        private readonly logger: WinstonLogger,
    ) { }

    async prepare(
        {
            bot,
            state,
        }: PrepareOpenPositionParams
    ): Promise<PrepareOpenPositionResponse> {
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
        const { tickLower, tickUpper } = await this.tickMathService.getTickBounds({
            state: _state,
            bot,
        })
        const {
            txb: openPositionTxb,
            feeAmountA,
            feeAmountB,
        } = await this.openPositionTxbService.createOpenPositionTxb({
            txb,
            bot,
            amountAMax: snapshotTargetBalanceAmountBN,
            amountBMax: snapshotQuoteBalanceAmountBN,
            liquidity: new BN(0),
            tickLower,
            state: _state,
            tickUpper,
        })
        const txHash = await openPositionTxb.getDigest()
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
        isRetry,
        txHash,
        txb,
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
                            if (txBlock !== null) {
                                const { liquidity, positionId } = this.parseIncreaseLiquidityEvent(txBlock?.events || [])
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
                            },
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
                        const { liquidity, positionId } = this.parseIncreaseLiquidityEvent(events || [])
                        return {
                            liquidity: new BN(liquidity),
                            positionId,
                        }
                    },
                })
            },
        })
    }

    private parseIncreaseLiquidityEvent(
        events?: Array<SuiEvent>,
    ): {
        liquidity: string
        positionId: string
    } {
        const event = events?.find((event) =>
            event.type.includes("::position_manager::IncreaseLiquidity"),
        )
        if (!event) {
            throw new TransactionEventNotFoundException(
                "IncreaseLiquidity event not found",
            )
        }
        const parsed = event.parsedJson as IncreaseLiquidityEvent
        return {
            liquidity: parsed.liquidity,
            positionId: parsed.position_id,
        }
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

