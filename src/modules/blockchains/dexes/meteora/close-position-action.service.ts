import {
    Injectable 
} from "@nestjs/common"
import {
    ExecuteClosePositionParams,
    IClosePositionActionService,
    DlmmLiquidityPoolState,
    PrepareClosePositionParams,
    PrepareClosePositionResult,
} from "../../interfaces"
import {
    SignerService 
} from "../../signers"
import { 
    AppVersion,
    PrimaryMemoryStorageService
} from "@modules/databases"
import {
    ClosePositionInstructionService 
} from "./transactions"
import { 
    ActivePositionNotFoundException,
    EncryptedPrivySignerPrivateKeyNotFoundException,
    PrivyMetadataNotFoundException,
    InvalidPoolTokensException,
    TransactionNotExecutedException,
    ErrorTransactionType,
    MissingSolanaTxParamException,
} from "@exceptions"
import {
    RpcExecutorService 
} from "../../clients"
import {
    RpcAccessType 
} from "@modules/filesystem"
import {
    WinstonLog, WinstonService 
} from "@modules/winston"
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
    address,
} from "@solana/kit"
import {
    PrivySignService 
} from "@modules/privy"

@Injectable()
export class MeteoraClosePositionActionService implements IClosePositionActionService {
    constructor(
        private readonly closePositionInstructionService: ClosePositionInstructionService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly signerService: SignerService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly privySignService: PrivySignService,
        private readonly winstonService: WinstonService,
    ) { }

    async prepare(
        { bot, state }: PrepareClosePositionParams
    ): Promise<PrepareClosePositionResult> {
        const _state = state as DlmmLiquidityPoolState
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: state.static.tokenA.toString(),
        })
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: state.static.tokenB.toString(),
        })
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: state.static.displayId,
            })
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
                    createTransactionMessage({
                        version: 0 
                    }),
                    (tx) => setTransactionMessageFeePayerSigner(createNoopSigner(address(bot.accountAddress)),
                        tx),
                    (tx) => appendTransactionMessageInstructions(instructions,
                        tx),
                    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash,
                        tx),
                )
                const transaction = compileTransaction(transactionMessage)
                if (bot.version === AppVersion.V1) {
                    return await this.signerService.withSolanaSigner({
                        bot,
                        action: async (signer) => {
                            const signedTransaction = await signTransaction([signer.keyPair],
                                transaction)
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
                    if (!bot.privyMetadata) {
                        throw new PrivyMetadataNotFoundException({
                            botId: bot.id,
                        })
                    }
                    if (!bot.encryptedPrivySignerPrivateKeyPayload) {
                        throw new EncryptedPrivySignerPrivateKeyNotFoundException({
                            botId: bot.id,
                        })
                    }
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
        if (isRetry) {
            return await this.rpcExecutorService.withSolanaRpc({
                accessType: RpcAccessType.Http,
                callback: async ({ rpc }) => {
                    const transaction = await rpc.getTransaction(
                        signature(txHash), 
                        {
                            commitment: "confirmed", encoding: "base58" 
                        }
                    ).send()
                    if (transaction) {
                        return
                    }
                    throw new TransactionNotExecutedException({
                        botId: bot.id,
                        txHash,
                        liquidityPoolId: state.static.displayId,
                        type: ErrorTransactionType.ClosePosition,
                    })
                },
            })
        }
        if (!solanaTx) {
            throw new MissingSolanaTxParamException({
                botId: bot.id,
                type: ErrorTransactionType.ClosePosition,
            })
        }
        await this.rpcExecutorService.withSolanaRpc({
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
                    })
                this.winstonService.log(
                    WinstonLog.ClosePositionTransactionExecuted, 
                    {
                        botId: bot.id,
                        txHash,
                        liquidityPoolId: state.static.displayId,
                    }
                )
            },
        })
    }
}
