import { Injectable } from "@nestjs/common"
import {
    IOpenActionService,
    LiquidityPoolState,
    PrepareOpenPositionParams,
    PrepareOpenPositionResponse,
    ExecuteOpenPositionParams,
    ConfirmOpenPositionParams,
    ExecuteOpenPositionResponse,
    ConfirmOpenPositionResponse,
} from "../../interfaces"
import { LiquidityMath, SqrtPriceMath } from "@raydium-io/raydium-sdk-v2"
import { SignerService } from "../../signers"
import { PrimaryMemoryStorageService, RaydiumPositionMetadata } from "@modules/databases"
import { 
    InvalidPoolTokensException, 
    SnapshotBalancesNotSetException,
    TransactionNotPreparedException,
    PositionIdNotSetException,
    PositionNotFoundException,
    TransactionNotExecutedException,
} from "@exceptions"
import { TickMathService } from "../../math"
import { 
    pipe,
    setTransactionMessageFeePayerSigner,
    setTransactionMessageLifetimeUsingBlockhash,
    compileTransaction,
    getSignatureFromTransaction,
    createTransactionMessage,
    appendTransactionMessageInstructions,
    sendAndConfirmTransactionFactory,
    signTransaction,
    assertIsSendableTransaction,
    assertIsTransactionWithinSizeLimit,
    createNoopSigner,
    address,
    signature,
    fetchEncodedAccount,
} from "@solana/kit"
import BN from "bn.js"
import { 
    OpenPositionInstructionService 
} from "./transactions"
import { adjustSlippage } from "@utils"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import Decimal from "decimal.js"
import { RpcExecutorService } from "../../clients"
import { RpcAccessType } from "@modules/filesystem"
import { envConfig } from "@modules/env"
import { PersonalPositionState } from "./beets"

@Injectable()
export class RaydiumOpenPositionActionService implements IOpenActionService {
    constructor(
        private readonly signerService: SignerService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly tickMathService: TickMathService,
        private readonly openPositionInstructionService: OpenPositionInstructionService,
        private readonly rpcExecutorService: RpcExecutorService,
        @InjectWinston()
        private readonly logger: WinstonLogger,
    ) { }

    async prepare(
        {
            state,
            bot,
        }: PrepareOpenPositionParams
    ): Promise<PrepareOpenPositionResponse> {
        const _state = state as LiquidityPoolState
        const slippage = new Decimal(envConfig().slippage.openPosition)
        const targetIsA = bot.targetToken.toString() === _state.static.tokenA.toString()
        const {
            snapshotTargetBalanceAmount,
            snapshotQuoteBalanceAmount,
            snapshotGasBalanceAmount,
        } = bot
        if (!snapshotTargetBalanceAmount || !snapshotQuoteBalanceAmount || !snapshotGasBalanceAmount) {
            throw new SnapshotBalancesNotSetException("Snapshot balances not set")
        }
        const tokenA = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === _state.static.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === _state.static.tokenB.toString())
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
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
        const {
            instructions: openPositionInstructions,
            mintKeyPair,
            ataAddress,
            feeAmountA,
            feeAmountB,
            personalPosition,
        } = await this.openPositionInstructionService.createOpenPositionInstructions({
            bot,
            state: _state,
            liquidity,
            amountAMax: amountA,
            amountBMax: amountB,
            tickLower,
            tickUpper,
        })
        return await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Write,
            callback: async ({ rpc }) => {
                return await this.signerService.withSolanaSigner({
                    bot,
                    action: async (signer) => {
                        const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
                        const transactionMessage = pipe(
                            createTransactionMessage({ version: 0 }),
                            (tx) => setTransactionMessageFeePayerSigner(createNoopSigner(address(bot.accountAddress)), tx),
                            (tx) => appendTransactionMessageInstructions(openPositionInstructions, tx),
                            (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
                        )
                        const transaction = compileTransaction(transactionMessage)
                        // sign the transaction
                        const signedTransaction = await signTransaction([signer.keyPair, mintKeyPair.keyPair], transaction)
                        const transactionSignature = getSignatureFromTransaction(signedTransaction)
                        assertIsSendableTransaction(signedTransaction)
                        assertIsTransactionWithinSizeLimit(signedTransaction)   
                        const txHash = transactionSignature.toString()
                        // get the raydium position metadata
                        const metadata: RaydiumPositionMetadata = {
                            nftMintAddress: mintKeyPair.address.toString(),
                            ataAddress: ataAddress.toString(),
                        }
                        return {
                            txHash,
                            solanaTx: signedTransaction,
                            feeAmountA,
                            feeAmountB,
                            tickLower,
                            tickUpper,
                            amountA,
                            amountB,
                            metadata,  
                            positionId: personalPosition.toString(),
                        }
                    },
                })
            },
        })
    }

    async execute({
        isRetry,
        txHash,
        solanaTx,
        positionId,
        bot,
        state,
    }: ExecuteOpenPositionParams): Promise<ExecuteOpenPositionResponse> {
        if (!positionId) {
            throw new PositionIdNotSetException("Position id not set")
        }
        const _state = state as LiquidityPoolState
        if (isRetry) {
            return await this.rpcExecutorService.withSolanaRpc({
                accessType: RpcAccessType.Read,
                callback: async ({ rpc }) => {
                    const transaction = await rpc.getTransaction(
                        signature(txHash), 
                        { commitment: "confirmed", encoding: "base58" }
                    ).send()
                    if (transaction) {
                        return {
                            positionId: positionId.toString(),
                        }
                    }
                    throw new TransactionNotExecutedException("Transaction not executed")
                },
            })  
        }
        if (!solanaTx) {
            throw new TransactionNotPreparedException("Transaction not prepared")
        }
        return await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Write,
            callback: async ({ rpc, rpcSubscriptions }) => {    
                const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
                    rpc,
                    rpcSubscriptions,
                })
                await sendAndConfirmTransaction(
                    solanaTx, 
                    {
                        commitment: "confirmed",
                        maxRetries: BigInt(envConfig().timeConfig.retry.maxRetries),
                    }
                )
                this.logger.verbose(
                    WinstonLog.OpenPositionExecuted, {
                        botId: bot.id,
                        txHash,
                        liquidityPoolId: _state.static.displayId,
                    }
                )
                return {
                    positionId,
                }
            },
        })
    }

    async confirm(
        {
            positionId,
        }: ConfirmOpenPositionParams
    ): Promise<ConfirmOpenPositionResponse> {
        return await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Read,
            callback: async ({ rpc }) => {
                const positionInfo = await fetchEncodedAccount(
                    rpc, 
                    address(positionId), {
                        commitment: "confirmed",
                    })
                if (!positionInfo || !positionInfo.exists) {
                    throw new PositionNotFoundException("Position not found")
                }
                const [personalPositionState] = PersonalPositionState.struct.deserialize(Buffer.from(positionInfo.data), 8)
                return {
                    liquidity: new BN(personalPositionState.liquidity.toString()),
                }
            },
        })
    }
}

