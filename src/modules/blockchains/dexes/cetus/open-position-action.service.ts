import { Injectable } from "@nestjs/common"
import {
    ConfirmOpenPositionParams,
    ConfirmOpenPositionResult,
    ExecuteOpenPositionResult,
    IOpenActionService,
    ClmmLiquidityPoolState,
    PrepareOpenPositionParams,
    PrepareOpenPositionResult,
} from "../../interfaces"
import { 
    ClmmPoolUtil,
    TickMath,
} from "@cetusprotocol/cetus-sui-clmm-sdk"
import { TransactionDataBuilder } from "@mysten/sui/transactions"
import { SignerService } from "../../signers"
import BN from "bn.js"
import { 
    AppVersion, BotSchema, DexId, PrimaryMemoryStorageService
} from "@modules/databases"
import {
    OpenPositionTxbService 
} from "./transactions"
import { 
    EnsureMathService, TickMathService 
} from "../../math"
import { 
    InvalidPoolTokensException, 
    SnapshotBalancesNotSetException,
    TransactionEventNotFoundException,
    TransactionNotPreparedException,
    TransactionNotExecutedException,
    TransactionValidationFailedException,
    PrivyPublicKeyNotFoundException,
    EnsureCalculationException,
    EnsureRangeType,
    SuiObjectNotFoundException,
    ErrorSuiObjectName,
    SuiObjectInvalidTypeException,
} from "@exceptions"
import Decimal from "decimal.js"
import { ExecuteOpenPositionParams } from "../../interfaces"
import { RpcExecutorService } from "../../clients"
import { RpcAccessType } from "@modules/filesystem"
import { WinstonService, WinstonLog } from "@modules/winston"
import { toScaledBN } from "@utils"
import { envConfig } from "@modules/env"
import { AsyncService } from "@modules/mixin"
import { SuiEvent } from "@mysten/sui/client"
import { CetusLiquidityPosition } from "./struct"
import { PrivySignService } from "@modules/privy"

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
    private readonly winstonService: WinstonService,
    private readonly privySignService: PrivySignService,
    ) {}

    async confirm({ positionId, state }: ConfirmOpenPositionParams): Promise<ConfirmOpenPositionResult> {
        const _state = state as ClmmLiquidityPoolState
        return await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                const objectInfo = await suiClient.getObject({
                    id: positionId,
                    options: {
                        showContent: true,
                    }
                })
                if (!objectInfo) {
                    throw new SuiObjectNotFoundException(
                        {
                            name: ErrorSuiObjectName.Position,
                            id: positionId,
                            dexId: DexId.Cetus,
                            liquidityPoolId: _state.static.displayId,
                        }
                    )
                }
                if (objectInfo?.data?.content?.dataType !== "moveObject") {
                    throw new SuiObjectInvalidTypeException(
                        {
                            name: ErrorSuiObjectName.Position,
                            id: positionId,
                            dexId: DexId.Cetus,
                            liquidityPoolId: _state.static.displayId,
                        }
                    )
                }
                const fields = objectInfo.data.content.fields as unknown as CetusLiquidityPosition
                return {
                    liquidity: new BN(fields.liquidity),
                }
            },
        })
    }

    private parseAddLiquidityEvent(
        {
            state,
            bot,
            txHash,
            events,
        }: ParseAddLiquidityEventParams
    ): ParseAddLiquidityEventResult {
        const eventType = "::pool::AddLiquidityV2Event"
        const event = events?.find(event =>
            event.type.includes(eventType),
        )
        if (!event) {
            throw new TransactionEventNotFoundException(
                {
                    botId: bot.id,
                    txHash,
                    eventType,
                    liquidityPoolId: state.static.displayId,
                }
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
    ): Promise<PrepareOpenPositionResult> {
        const _state = state as ClmmLiquidityPoolState
        if (!bot.snapshotTargetBalanceAmount || !bot.snapshotQuoteBalanceAmount || !bot.snapshotGasBalanceAmount) {
            throw new SnapshotBalancesNotSetException({
                botId: bot.id,
            })
        }
        const snapshotTargetBalanceAmountBN = new BN(bot.snapshotTargetBalanceAmount)
        const snapshotQuoteBalanceAmountBN = new BN(bot.snapshotQuoteBalanceAmount)
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: _state.static.tokenA.toString()
        })
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: _state.static.tokenB.toString()
        })
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: _state.static.displayId,
            })
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
            TickMath.tickIndexToSqrtPriceX64(_state.dynamic.tickCurrent.toNumber()),
        )
        const lowerBound = new Decimal(1).sub(new Decimal(envConfig().slippage.openPosition.amountBounds))
        const upperBound = new Decimal(1).add(new Decimal(envConfig().slippage.openPosition.amountBounds))
        const { isAcceptable, ratio } = this.ensureMathService.ensureBetween(
            {
                expected: amountB,
                actual: expectedAmountB,
                // this indicates the slippage tolerance
                lowerBound,
                upperBound,
            }
        )
        if (!isAcceptable) {
            throw new EnsureCalculationException(
                {
                    expected: amountB,
                    actual: expectedAmountB,
                    rangeType: EnsureRangeType.Between,
                    lowerBound,
                    upperBound,
                }
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
                if (bot.version === AppVersion.V1) {
                    return await this.signerService.withSuiSigner({
                        bot,
                        action: async (signer) => {
                        // dev inspect the transaction block
                            const devInspect = await suiClient.devInspectTransactionBlock({
                                transactionBlock: openPositionTxb,
                                sender: bot.accountAddress,
                            })
                            if (devInspect.effects.status.status !== "success") {
                                throw new TransactionValidationFailedException(
                                    {
                                        botId: bot.id,
                                        txHash: devInspect.effects.transactionDigest,
                                        liquidityPoolId: _state.static.displayId,
                                    }
                                )
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
                } else {
                    if (!bot.privyMetadata.walletPublicKey) {
                        throw new PrivyPublicKeyNotFoundException(
                            {
                                botId: bot.id,
                            }
                        )
                    }
                    const { txHash, signatureWithBytes } = await this.privySignService.signSuiTransaction({
                        publicKeyHex: bot.privyMetadata.walletPublicKey,
                        client: suiClient,
                        walletId: bot.privyMetadata.walletId,
                        transaction: openPositionTxb,
                        encryptedPrivySignerPrivateKey: bot.encryptedPrivySignerPrivateKeyPayload,
                    })
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
                }
            },
        })
    }
    
    async execute({
        bot,
        state,
        isRetry, // whether to retry the transaction
        txHash, // the tx hash of the open position transaction
        signatureWithBytes, // the signature with bytes of the open position transaction    
    }: ExecuteOpenPositionParams): Promise<ExecuteOpenPositionResult> {
        const _state = state as ClmmLiquidityPoolState
        if (isRetry) {
            const [txBlock] = await this.asyncService.resolveTuple(
                this.rpcExecutorService.withSuiClient({
                    accessType: RpcAccessType.Http,
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
                const { positionId } = this.parseAddLiquidityEvent({
                    state: _state,
                    bot,
                    txHash,
                    events: txBlock?.events || [],
                })
                return {
                    positionId,
                }
            }
            throw new TransactionNotExecutedException({
                botId: bot.id,
                txHash,
                liquidityPoolId: _state.static.displayId,
            })
        }
        if (!signatureWithBytes) {
            throw new TransactionNotPreparedException({
                botId: bot.id,
                txHash,
                liquidityPoolId: _state.static.displayId,
            })
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
                this.winstonService.log(
                    WinstonLog.OpenPositionTransactionExecuted, {
                        botId: bot.id,
                        txHash: digest,
                        liquidityPoolId: _state.static.displayId,
                    }
                )
                // parse the add liquidity event
                const { positionId } = this.parseAddLiquidityEvent({
                    state: _state,
                    bot,
                    txHash,
                    events: events || [],
                })
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

export interface ParseAddLiquidityEventResult {
    positionId: string
}

export interface ParseAddLiquidityEventParams {
    state: ClmmLiquidityPoolState
    events?: Array<SuiEvent>
    bot: BotSchema
    txHash: string
}