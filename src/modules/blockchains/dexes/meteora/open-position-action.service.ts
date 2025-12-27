import { Injectable } from "@nestjs/common"
import {
    IOpenActionService,
    DlmmLiquidityPoolState,
    PrepareOpenPositionParams,
    PrepareOpenPositionResponse,
    ExecuteOpenPositionParams,
    ExecuteOpenPositionResponse,
    ConfirmOpenPositionResponse,
    ConfirmOpenPositionParams,
} from "../../interfaces"
import { SignerService } from "../../signers"
import { PrimaryMemoryStorageService } from "@modules/databases"
import { 
    InvalidPoolTokensException, 
    SnapshotBalancesNotSetException,
    TransactionNotPreparedException,
    PositionNotFoundException,
    TransactionNotExecutedException,
    PositionIdNotSetException,
} from "@exceptions"
import { 
    pipe,
    addSignersToTransactionMessage,
    setTransactionMessageFeePayerSigner,
    setTransactionMessageLifetimeUsingBlockhash,
    compileTransaction,
    getSignatureFromTransaction,
    createTransactionMessage,
    appendTransactionMessageInstructions,
    signature,
    sendAndConfirmTransactionFactory,
    signTransaction,
    assertIsTransactionWithinSizeLimit,
    assertIsSendableTransaction,
    address,
    fetchEncodedAccount,
} from "@solana/kit"
import BN from "bn.js"
import { 
    OpenPositionInstructionService 
} from "./transactions"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { RpcExecutorService } from "../../clients"
import { RpcAccessType } from "@modules/filesystem"
import { envConfig } from "@modules/env"

@Injectable()
export class MeteoraOpenPositionActionService implements IOpenActionService {
    constructor(
        private readonly openPositionInstructionService: OpenPositionInstructionService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly signerService: SignerService,
        private readonly rpcExecutorService: RpcExecutorService,
        @InjectWinston()
        private readonly logger: WinstonLogger,
    ) { }
    
    async prepare({
        state,
        bot,
    }: PrepareOpenPositionParams): Promise<PrepareOpenPositionResponse> {
        const _state = state as DlmmLiquidityPoolState
        const targetIsA = bot.targetToken.toString() === _state.static.tokenA.toString()
        const {
            snapshotTargetBalanceAmount,
            snapshotQuoteBalanceAmount,
            snapshotGasBalanceAmount,
        } = bot
        if (
            !snapshotTargetBalanceAmount ||
                !snapshotQuoteBalanceAmount ||
                !snapshotGasBalanceAmount
        ) {
            throw new SnapshotBalancesNotSetException("Snapshot balances not set")
        }
        const tokenA = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === _state.static.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === _state.static.tokenB.toString())
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
        const amountA = targetIsA ? new BN(snapshotTargetBalanceAmount) : new BN(snapshotQuoteBalanceAmount)
        const amountB = targetIsA ? new BN(snapshotQuoteBalanceAmount) : new BN(snapshotTargetBalanceAmount)
        const {
            instructions: openPositionInstructions,
            positionKeyPair,
            minBinId,
            maxBinId,
            feeAmountA,
            feeAmountB,
        } = await this.openPositionInstructionService.createOpenPositionInstructions({
            bot,
            state: _state,
            amountA,
            amountB,
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
                            (tx) => addSignersToTransactionMessage([signer, positionKeyPair], tx),
                            (tx) => setTransactionMessageFeePayerSigner(signer, tx),
                            (tx) => appendTransactionMessageInstructions(openPositionInstructions, tx),
                            (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
                        )
                        const transaction = compileTransaction(transactionMessage)
                        const signedTransaction = await signTransaction([signer.keyPair, positionKeyPair.keyPair], transaction)
                        assertIsSendableTransaction(signedTransaction)
                        assertIsTransactionWithinSizeLimit(signedTransaction)
                        const transactionSignature = getSignatureFromTransaction(signedTransaction)
                        const txHash = transactionSignature.toString()
                        return {
                            txHash,
                            solanaTx: signedTransaction,
                            feeAmountA,
                            feeAmountB,
                            amountA,
                            amountB,
                            minBinId,
                            maxBinId,
                            positionId: positionKeyPair.address.toString(),
                            positionKeyPair,
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
        solanaTx,
        txHash,
        positionId,
    }: ExecuteOpenPositionParams): Promise<ExecuteOpenPositionResponse> {
        if (!positionId) {
            throw new PositionIdNotSetException("Position id not set")
        }
        const _state = state as DlmmLiquidityPoolState
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
                    solanaTx, {
                        commitment: "confirmed",
                        maxRetries: BigInt(envConfig().timeConfig.retry.maxRetries),
                    })
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
                return {
                    // temporary empty, will need other logic to get liquidity
                }
            },
        })
    }
}
