import { Injectable } from "@nestjs/common"
import {
    IOpenActionService,
    LiquidityPoolState,
    PrepareOpenPositionParams,
    PrepareOpenPositionResponse,
    ExecuteOpenPositionParams,
    ExecuteOpenPositionResponse,
    ConfirmOpenPositionParams,
    ConfirmOpenPositionResponse,
} from "../../interfaces"
import { Transaction, TransactionDataBuilder } from "@mysten/sui/transactions"
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
    PositionNotFoundException,
    PositionInvalidTypeException,
} from "@exceptions"
import { RpcExecutorService } from "../../clients"
import { RpcAccessType } from "@modules/filesystem"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { AsyncService } from "@modules/mixin"
import { SuiEvent } from "@mysten/sui/client"
import { FlowxClmmPosition } from "./struct"

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
    
    async confirm(
        { positionId }: ConfirmOpenPositionParams
    ): Promise<ConfirmOpenPositionResponse> {
        return await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Read,
            callback: async ({ suiClient }) => {
                const objectInfo = await suiClient.getObject({
                    id: positionId,
                    options: {
                        showContent: true,
                    }
                })
                if (!objectInfo) {
                    throw new PositionNotFoundException("Position not found")
                }
                if (objectInfo?.data?.content?.dataType !== "moveObject") {
                    throw new PositionInvalidTypeException("Position is not a move object")
                }
                const fields = objectInfo.data.content.fields as unknown as FlowxClmmPosition
                return {
                    liquidity: new BN(fields.liquidity),
                }
            },
        })
    }
    
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
        return await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Write,
            callback: async ({ suiClient }) => {
                return await this.signerService.withSuiSigner({
                    bot,
                    action: async (signer) => {
                        const bytes = await openPositionTxb.build({
                            client: suiClient,
                        })
                        const txHash = TransactionDataBuilder.getDigestFromBytes(bytes)
                        const signatureWithBytes = await signer.signTransaction(bytes)
                        return {
                            txHash,
                            signatureWithBytes,
                            feeAmountA,
                            feeAmountB,
                            tickLower,
                            tickUpper,
                        }
                    },
                })
            },
        })
    }

    async execute({
        bot,
        state,
        isRetry,
        txHash,
        signatureWithBytes,
    }: ExecuteOpenPositionParams): Promise<ExecuteOpenPositionResponse> {
        const _state = state as LiquidityPoolState
        if (isRetry) {
            const [txBlock] = await this.asyncService.resolveTuple(
                this.rpcExecutorService.withSuiClient({
                    accessType: RpcAccessType.Read,
                    callback: async ({ suiClient }) => {
                        return suiClient.getTransactionBlock({
                            digest: txHash,
                            options: {
                                showEvents: true,
                            }
                        })
                    },
                })
            )
            if (txBlock !== null) {
                const { positionId } = this.parseIncreaseLiquidityEvent(txBlock?.events || [])
                return {
                    positionId,
                }
            }
            throw new TransactionNotExecutedException("Transaction not executed")
        }
        if (!signatureWithBytes) {
            throw new TransactionNotPreparedException("Transaction not prepared")
        }
        return await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Write,
            callback: async ({ suiClient }) => {
                const { digest, events } = await suiClient.executeTransactionBlock({
                    transactionBlock: signatureWithBytes.bytes,
                    signature: signatureWithBytes.signature,
                    options: {
                        showEvents: true,
                    },
                })
                await suiClient.waitForTransaction({
                    digest,
                })
                this.logger.verbose(
                    WinstonLog.OpenPositionExecuted, {
                        botId: bot.id,
                        txHash: digest,
                        liquidityPoolId: _state.static.displayId,
                    }
                )
                const { positionId } = this.parseIncreaseLiquidityEvent(events || [])
                return {
                    positionId,
                }
            },
        })
    }

    private parseIncreaseLiquidityEvent(
        events?: Array<SuiEvent>,
    ): ParseIncreaseLiquidityEventResponse {
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
            positionId: parsed.position_id,
        }
    }
}

interface IncreaseLiquidityEvent {
    amount_x: string
    amount_y: string
    liquidity: string
    pool_id: string
    position_id: string
    sender: string
}

interface ParseIncreaseLiquidityEventResponse {
    positionId: string
}
