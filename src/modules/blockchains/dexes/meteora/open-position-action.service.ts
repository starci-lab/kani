import { Injectable } from "@nestjs/common"
import {
    IOpenActionService,
    DlmmLiquidityPoolState,
    PrepareOpenPositionParams,
    PrepareOpenPositionResponse,
    ExecuteOpenPositionParams,
    ExecuteOpenPositionResponse,
} from "../../interfaces"
import { SignerService } from "../../signers"
import { PrimaryMemoryStorageService } from "@modules/databases"
import { 
    InvalidPoolTokensException, 
    SnapshotBalancesNotSetException,
    TransactionMessageTooLargeException,
    TransactionNotPreparedException,
    TransactionNotExecutedException,
    MintKeyPairNotSetException,
    AtaAddressNotSetException,
} from "@exceptions"
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
        txHash,
        solanaTx,
        ataAddress,
        mintKeyPair,
    }: ExecuteOpenPositionParams): Promise<ExecuteOpenPositionResponse> {
        if (!ataAddress) {
            throw new AtaAddressNotSetException("Ata address not set")
        }
        if (!mintKeyPair) {
            throw new MintKeyPairNotSetException("Mint key pair not set")
        }
        const _state = state as DlmmLiquidityPoolState
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
                            positionId: ataAddress,
                        }
                    },
                })
            },
        })
    }
}

