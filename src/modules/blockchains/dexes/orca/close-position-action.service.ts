import { Injectable } from "@nestjs/common"
import {
    ExecuteClosePositionParams,
    IClosePositionActionService,
    LiquidityPoolState,
    PrepareClosePositionParams,
    PrepareClosePositionResult,
} from "../../interfaces"
import { SignerService } from "../../signers"
import { 
    AppVersion,
    PrimaryMemoryStorageService
} from "@modules/databases"
import { 
    ClosePositionInstructionService, 
} from "./transactions"
import { 
    ActivePositionNotFoundException,
    InvalidPoolTokensException, 
    TransactionNotExecutedException,
    TransactionNotPreparedException,
} from "@exceptions"
import { RpcExecutorService } from "../../clients"
import { RpcAccessType } from "@modules/filesystem"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as winstonLogger } from "winston"
import { 
    pipe,
    setTransactionMessageFeePayerSigner,
    setTransactionMessageLifetimeUsingBlockhash,
    compileTransaction,
    getSignatureFromTransaction,
    createTransactionMessage,
    appendTransactionMessageInstructions,
    sendAndConfirmTransactionFactory,
    signature,
    assertIsSendableTransaction,
    assertIsTransactionWithinSizeLimit,
    signTransaction,
    createNoopSigner,
    address
} from "@solana/kit"
import { envConfig } from "@modules/env"
import { PrivySignService } from "@modules/privy"

@Injectable()
export class OrcaClosePositionActionService implements IClosePositionActionService {
    constructor(
        private readonly signerService: SignerService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly closePositionInstructionService: ClosePositionInstructionService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly privySignService: PrivySignService,
        @InjectWinston()
        private readonly logger: winstonLogger,
    ) {}

    async prepare(
        { bot, state }: PrepareClosePositionParams
    ): Promise<PrepareClosePositionResult> {
        const _state = state as LiquidityPoolState
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException(
                bot.id, 
                "Active position not found"
            )
        }
        const tokenA = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === state.static.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === state.static.tokenB.toString())
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
        const instructions = await this.closePositionInstructionService.createCloseInstructions({
            bot,
            state: _state,
        })
        return await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Http,
            callback: async ({ rpc }) => {
                const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
                const transactionMessage = pipe(
                    createTransactionMessage({ version: 0 }),
                    (tx) => setTransactionMessageFeePayerSigner(createNoopSigner(address(bot.accountAddress)), tx),
                    (tx) => appendTransactionMessageInstructions(instructions, tx),
                    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
                )
                const transaction = compileTransaction(transactionMessage)
                if (bot.version === AppVersion.V1) {
                    return await this.signerService.withSolanaSigner({
                        bot,
                        action: async (signer) => {
                            const signedTransaction = await signTransaction([signer.keyPair], transaction)
                            const transactionSignature = getSignatureFromTransaction(signedTransaction)
                            const txHash = transactionSignature.toString()
                            assertIsSendableTransaction(signedTransaction)
                            assertIsTransactionWithinSizeLimit(signedTransaction)
                            return {
                                txHash,
                                solanaTx: signedTransaction,
                            }
                        },
                    })
                } else {
                    const signedTransaction = await this.privySignService.signSolanaTransaction({
                        lifetimeConstraint: {
                            blockhash: latestBlockhash.blockhash,
                            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
                        },
                        transaction,
                        encryptedPrivySignerPrivateKey: bot.encryptedPrivySignerPrivateKeyPayload,
                        walletId: bot.privyMetadata.walletId,
                    })
                    return {
                        txHash: signedTransaction.txHash,
                        solanaTx: signedTransaction.signedTransaction,
                    }
                }
            },
        })
    }

    async execute(
        { bot, state, isRetry, solanaTx, txHash }: ExecuteClosePositionParams
    ): Promise<void> {

        if (!solanaTx) {
            throw new TransactionNotPreparedException("Transaction not prepared")
        }
        if (isRetry) {
            return await this.rpcExecutorService.withSolanaRpc({
                accessType: RpcAccessType.Http,
                callback: async ({ rpc }) => {
                    const transaction = await rpc.getTransaction(
                        signature(txHash), 
                        { commitment: "confirmed", encoding: "base58" }
                    ).send()
                    if (transaction) {
                        return
                    }
                    throw new TransactionNotExecutedException("Transaction not executed")
                },
            })
        }
        if (!solanaTx) {
            throw new TransactionNotPreparedException("Transaction not prepared")
        }
        await this.rpcExecutorService.withSolanaRpc({
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
                    WinstonLog.ClosePositionExecuted, {
                        botId: bot.id,
                        txHash,
                        liquidityPoolId: state.static.displayId,
                    }
                )
            },
        })
    }
}

