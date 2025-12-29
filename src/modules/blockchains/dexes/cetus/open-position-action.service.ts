import { Injectable } from "@nestjs/common"
import {
    ConfirmOpenPositionParams,
    ConfirmOpenPositionResponse,
    IOpenActionService,
    LiquidityPoolState,
    PrepareOpenPositionParams,
    PrepareOpenPositionResponse,
} from "../../interfaces"
import { 
    ClmmPoolUtil,
    TickMath,
} from "@cetusprotocol/cetus-sui-clmm-sdk"
import { TransactionDataBuilder } from "@mysten/sui/transactions"
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
    PositionNotFoundException,
    PositionInvalidTypeException,
    TransactionValidationFailedException
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
import { CetusLiquidityPosition } from "./struct"

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

    async confirm({ positionId }: ConfirmOpenPositionParams): Promise<ConfirmOpenPositionResponse> {
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
                const fields = objectInfo.data.content.fields as unknown as CetusLiquidityPosition
                return {
                    liquidity: new BN(fields.liquidity),
                }
            },
        })
    }

    private parseAddLiquidityEvent(
        events?: Array<SuiEvent>,
    ): ParseAddLiquidityEventResponse {
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
            positionId: parsed.position.toString(),
        }
    }

    async prepare(
        {
            bot,
            state,
        }: PrepareOpenPositionParams
    ): Promise<PrepareOpenPositionResponse> {
        const _state = state as LiquidityPoolState
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
            0, // zero slippage
            TickMath.tickIndexToSqrtPriceX64(_state.dynamic.tickCurrent),
        )
        const { isAcceptable, ratio } = this.ensureMathService.ensureBetween({
            expected: amountB,
            actual: expectedAmountB,
            // this indicates the slippage tolerance
            lowerBound: new Decimal(1).sub(new Decimal(envConfig().bounds.sui.openPosition.lowerBound)),
            upperBound: new Decimal(1).add(new Decimal(envConfig().bounds.sui.openPosition.upperBound)),
        })
        if (!isAcceptable) {
            throw new AmountBInBetweenExpectedException(
                ratio, 
                `Amount B is not in between expected: ${ratio.toString()}`
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
            bot,
            amountAMax: amountA,
            amountBMax: amountB,
            liquidity: new BN(0),
            tickLower,
            state: _state,
            tickUpper,
        }
        )
        return await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Write,
            callback: async ({ suiClient }) => {
                return await this.signerService.withSuiSigner({
                    bot,
                    action: async (signer) => {
                        // dev inspect the transaction block
                        const devInspect = await suiClient.devInspectTransactionBlock({
                            transactionBlock: openPositionTxb,
                            sender: bot.accountAddress,
                        })
                        if (devInspect.effects.status.status !== "success") {
                            throw new TransactionValidationFailedException("Transaction validation failed")
                        }
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
                            amountA,
                            amountB,
                        }
                    },
                })
            },
        })
    }
    
    async execute({
        bot,
        state,
        isRetry, // whether to retry the transaction
        txHash, // the tx hash of the open position transaction
        signatureWithBytes, // the signature with bytes of the open position transaction    
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
                const { positionId } = this.parseAddLiquidityEvent(txBlock?.events || [])
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
                    }
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
                // parse the add liquidity event
                const { positionId } = this.parseAddLiquidityEvent(events || [])
                return {
                    positionId,
                }
            },
        })
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

export interface ParseAddLiquidityEventResponse {
    positionId: string
}