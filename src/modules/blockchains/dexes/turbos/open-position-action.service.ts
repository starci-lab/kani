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
import { Transaction } from "@mysten/sui/transactions"
import { SignerService } from "../../signers"
import BN from "bn.js"
import { 
    PrimaryMemoryStorageService
} from "@modules/databases"
import { OpenPositionTxbService } from "./transactions"
import { TickMathService } from "../../math"
import { 
    AmountBInBetweenExpectedException,
    InvalidPoolTokensException, 
    SnapshotBalancesNotSetException,
    TransactionEventNotFoundException,
    TransactionNotPreparedException,
    TransactionNotExecutedException,
    PositionNotFoundException,
    PositionInvalidTypeException,
} from "@exceptions"
import Decimal from "decimal.js"
import { RpcExecutorService } from "../../clients"
import { RpcAccessType } from "@modules/filesystem"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { Network, TurbosSdk } from "turbos-clmm-sdk"
import { EnsureMathService } from "../../math"
import { toScaledBN } from "@utils"
import { AsyncService } from "@modules/mixin"
import { SuiEvent } from "@mysten/sui/client"
import { MintNftEvent, TurbosClmmPosition, TurbosPositionNFT } from "./struct"

@Injectable()
export class TurbosOpenPositionActionService implements IOpenActionService {
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
    
    async confirm(
        { positionId }: ConfirmOpenPositionParams
    ): Promise<ConfirmOpenPositionResponse> {
        return await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Read,
            callback: async ({ suiClient }) => {
                const positionNft = await suiClient.getObject({
                    id: positionId,
                })
                if (!positionNft) {
                    throw new PositionNotFoundException("Position not found")
                }
                if (positionNft?.data?.content?.dataType !== "moveObject") {
                    throw new PositionInvalidTypeException("Position is not a move object")
                }
                const positionNftFields = positionNft.data.content.fields as unknown as TurbosPositionNFT
                const clmmPosition = await suiClient.getObject({
                    id: positionNftFields.pool_id,
                })
                if (!clmmPosition) {
                    throw new PositionNotFoundException("CLMM position not found")
                }
                if (clmmPosition?.data?.content?.dataType !== "moveObject") {
                    throw new PositionInvalidTypeException("CLMM position is not a move object")
                }
                const clmmPositionFields = clmmPosition.data.content.fields as unknown as TurbosClmmPosition
                return {
                    liquidity: new BN(clmmPositionFields.liquidity),
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
            liquidity: new BN(0),
            amountAMax: amountA,
            amountBMax: amountB,
            tickLower,
            state: _state,
            tickUpper,
        })
        const txHash = await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Read,
            callback: async ({ suiClient }) => {
                return await txb.getDigest({ client: suiClient })
            },
        })
        return {
            txHash,
            txb: openPositionTxb,
            feeAmountA,
            feeAmountB,
            tickLower,
            tickUpper,
            amountA,
            amountB,
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
                const { positionId } = this.parseMintEvents(txBlock?.events || [])
                return {
                    positionId,
                }
            }
            throw new TransactionNotExecutedException("Transaction not executed")
        }
        if (!txb) {
            throw new TransactionNotPreparedException("Transaction not prepared")
        }
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
                                const { positionId } = this.parseMintEvents(txBlock?.events || [])
                                return {
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
                            WinstonLog.OpenPositionExecuted, {
                                botId: bot.id,
                                txHash: digest,
                                liquidityPoolId: _state.static.displayId,
                            }
                        )
                        const { positionId } = this.parseMintEvents(events || [])
                        return {
                            positionId,
                        }
                    },
                })
            },
        })
    }

    private parseMintEvents(
        events?: Array<SuiEvent>,
    ): ParseMintEventsResponse {
        const mintNftEvent = events?.find(
            event => event.type.includes("position_manager::MintNftEvent")
        )
        if (!mintNftEvent) {
            throw new TransactionEventNotFoundException("MintNft event not found")
        }
        const mintNftEventParsed = mintNftEvent.parsedJson as MintNftEvent
        const positionId = mintNftEventParsed.nft_address
        return {
            positionId,
        }
    }
}

interface ParseMintEventsResponse {
    positionId: string
}
