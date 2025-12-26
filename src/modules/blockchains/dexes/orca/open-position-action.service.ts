import { Injectable } from "@nestjs/common"
import {
    IOpenActionService,
    LiquidityPoolState,
    PrepareOpenPositionParams,
    PrepareOpenPositionResponse,
    ExecuteOpenPositionParams,
    ExecuteOpenPositionResponse,
} from "../../interfaces"
import { LiquidityMath, SqrtPriceMath } from "@raydium-io/raydium-sdk-v2"
import { SignerService } from "../../signers"
import { PrimaryMemoryStorageService } from "@modules/databases"
import { 
    InvalidPoolTokensException, 
    SnapshotBalancesNotSetException,
    TransactionMessageTooLargeException,
    TransactionNotPreparedException,
    TransactionNotExecutedException,
    MintKeyPairNotSetException,
    LiquidityNotSetException,
    AtaAddressNotSetException,
} from "@exceptions"
import { TickMathService } from "../../math"
import { 
    pipe,
    addSignersToTransactionMessage,
    setTransactionMessageFeePayerSigner,
    setTransactionMessageLifetimeUsingBlockhash,
    isTransactionMessageWithinSizeLimit,
    compileTransaction,
    getSignatureFromTransaction,
    createTransactionMessage,
    appendTransactionMessageInstructions,
    signature,
    sendAndConfirmTransactionFactory,
    signTransaction,
} from "@solana/kit"
import BN from "bn.js"
import { 
    OpenPositionInstructionService 
} from "./transactions"
import { adjustSlippage } from "@utils"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as winstonLogger } from "winston"
import Decimal from "decimal.js"
import { RpcExecutorService } from "../../clients"
import { RpcAccessType } from "@modules/filesystem"
import { envConfig } from "@modules/env"

@Injectable()
export class OrcaOpenPositionActionService implements IOpenActionService {
    constructor(
        private readonly signerService: SignerService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly tickMathService: TickMathService,
        private readonly openPositionInstructionService: OpenPositionInstructionService,
        private readonly rpcExecutorService: RpcExecutorService,
        @InjectWinston()
        private readonly logger: winstonLogger,
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
            mintKeyPair,
            ataAddress,
            instructions: openPositionInstructions,
            feeAmountA,
            feeAmountB,
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
                            (tx) => addSignersToTransactionMessage([signer, mintKeyPair], tx),
                            (tx) => setTransactionMessageFeePayerSigner(signer, tx),
                            (tx) => appendTransactionMessageInstructions(openPositionInstructions, tx),
                            (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
                        )
                        if (!isTransactionMessageWithinSizeLimit(transactionMessage)) {
                            throw new TransactionMessageTooLargeException("Transaction message is too large")
                        }
                        const transaction = compileTransaction(transactionMessage)
                        const transactionSignature = getSignatureFromTransaction(transaction)
                        const txHash = transactionSignature.toString()
                        return {
                            txHash,
                            solanaTx: transaction,
                            feeAmountA,
                            feeAmountB,
                            tickLower,
                            tickUpper,
                            amountA,
                            amountB,
                            metadata: {
                                nftMintAddress: mintKeyPair.address.toString(),
                            },
                            ataAddress: ataAddress.toString(),
                            liquidity,
                            mintKeyPair,
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
        solanaTx,
        ataAddress,
        liquidity,
        mintKeyPair,
    }: ExecuteOpenPositionParams): Promise<ExecuteOpenPositionResponse> {
        if (!liquidity) {
            throw new LiquidityNotSetException("Liquidity not set")
        }
        if (!ataAddress) {
            throw new AtaAddressNotSetException("Ata address not set")
        }
        const _state = state as LiquidityPoolState
        return await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Write,
            callback: async ({ rpc, rpcSubscriptions }) => {
                return await this.signerService.withSolanaSigner({
                    bot,
                    action: async (signer) => {
                        if (isRetry) {
                            const transactionExisted = await rpc.getTransaction(signature(txHash)).send()
                            if (transactionExisted) {
                                return {
                                    liquidity,
                                    positionId: ataAddress,
                                }
                            }
                            throw new TransactionNotExecutedException("Transaction not executed")
                        }
                        if (!solanaTx) {
                            throw new TransactionNotPreparedException("Transaction not prepared")
                        }
                        if (!mintKeyPair) {
                            throw new MintKeyPairNotSetException("Mint key pair not set")
                        }
                        const signedTransaction = await signTransaction([signer.keyPair, mintKeyPair.keyPair], solanaTx)
                        const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
                            rpc,
                            rpcSubscriptions,
                        })
                        const transactionSignature = getSignatureFromTransaction(signedTransaction)
                        await sendAndConfirmTransaction(
                            signedTransaction, {
                                commitment: "confirmed",
                                maxRetries: BigInt(envConfig().timeConfig.retry.maxRetries),
                            })
                        this.logger.info(
                            WinstonLog.OpenPositionExecutionSuccess, {
                                botId: bot.id,
                                txHash: transactionSignature.toString(),
                                liquidityPoolId: _state.static.displayId,
                            }
                        )
                        return {
                            liquidity,
                            positionId: ataAddress,
                        }
                    },
                })
            },
        })
    }
}

