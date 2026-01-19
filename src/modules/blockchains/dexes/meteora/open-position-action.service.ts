import {
    Injectable 
} from "@nestjs/common"
import {
    IOpenActionService,
    DlmmLiquidityPoolState,
    PrepareOpenPositionParams,
    PrepareOpenPositionResult,
    ExecuteOpenPositionParams,
    ExecuteOpenPositionResult,
    ConfirmOpenPositionResult,
    ConfirmOpenPositionParams,
} from "../../interfaces"
import {
    SignerService 
} from "../../signers"
import {
    AppVersion, DexId, PrimaryMemoryStorageService 
} from "@modules/databases"
import { 
    EncryptedPrivySignerPrivateKeyNotFoundException,
    InvalidPoolTokensException, 
    MissingPositionIdParamException, 
    PrivyMetadataNotFoundException, 
    SnapshotBalancesNotFoundException,
    TransactionNotExecutedException,
    ErrorTransactionType,
    MissingSolanaTxParamException,
    SolanaAccountNotFoundException,
    ErrorSolanaAccountName,
} from "@modules/exceptions"
import { 
    pipe,
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
    createNoopSigner,
    partiallySignTransaction,
} from "@solana/kit"
import BN from "bn.js"
import { 
    OpenPositionInstructionService 
} from "./transactions"
import {
    WinstonService, WinstonLog 
} from "@modules/winston"
import {
    RpcExecutorService 
} from "../../clients"
import {
    RpcAccessType 
} from "@modules/filesystem"
import {
    PrivySignService 
} from "@modules/privy"

@Injectable()
export class MeteoraOpenPositionActionService implements IOpenActionService {
    constructor(
        private readonly openPositionInstructionService: OpenPositionInstructionService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly signerService: SignerService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly privySignService: PrivySignService,
        private readonly winstonService: WinstonService,
    ) { }
    
    async prepare({
        state,
        bot,
    }: PrepareOpenPositionParams): Promise<PrepareOpenPositionResult> {
        const _state = state as DlmmLiquidityPoolState
        const targetIsA = bot.targetToken.toString() === _state.static.tokenA.toString()
        if (!bot.snapshots) {
            throw new SnapshotBalancesNotFoundException({
                botId: bot.id,
            })
        }
        const snapshotTargetBalanceAmount = new BN(bot.snapshots.targetBalanceAmount)
        const snapshotQuoteBalanceAmount = new BN(bot.snapshots.quoteBalanceAmount)
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: _state.static.tokenA.toString(),
            },
        })
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: _state.static.tokenB.toString(),
            },
        })
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: _state.static.displayId,
            })
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
                const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
                const transactionMessage = pipe(
                    createTransactionMessage({
                        version: 0 
                    }),
                    (tx) => setTransactionMessageFeePayerSigner(createNoopSigner(address(bot.accountAddress)),
                        tx),
                    (tx) => appendTransactionMessageInstructions(openPositionInstructions,
                        tx),
                    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash,
                        tx),
                )
                const transaction = compileTransaction(transactionMessage)
                if (bot.version === AppVersion.V1) {
                    return await this.signerService.withSolanaSigner({
                        bot,
                        action: async (signer) => {
                            const signedTransaction = await signTransaction([signer.keyPair,
                                positionKeyPair.keyPair],
                            transaction)
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
                    // partial sign the transaction
                    const partialSignedTransaction = await partiallySignTransaction([positionKeyPair.keyPair],
                        transaction)
                    const signedTransaction = await this.privySignService.signSolanaTransaction({
                        lifetimeConstraint: {
                            blockhash: latestBlockhash.blockhash,
                            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
                        },
                        transaction: partialSignedTransaction,
                        encryptedPrivySignerPrivateKey: bot.encryptedPrivySignerPrivateKeyPayload,
                        walletId: bot.privyMetadata.walletId,
                    })
                    return {
                        txHash: signedTransaction.txHash,
                        solanaTx: signedTransaction.signedTransaction,
                        feeAmountA,
                        feeAmountB,
                        amountA,
                        amountB,
                        minBinId,
                        maxBinId,
                        positionId: positionKeyPair.address.toString(),
                        positionKeyPair,
                    }
                }
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
    }: ExecuteOpenPositionParams): Promise<ExecuteOpenPositionResult> {
        if (!positionId) {
            throw new MissingPositionIdParamException({
                botId: bot.id,
                liquidityPoolId: state.static.displayId,
            })
        }
        const _state = state as DlmmLiquidityPoolState
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
                        return {
                            positionId: positionId.toString(),
                        }
                    }
                    throw new TransactionNotExecutedException({
                        botId: bot.id,
                        txHash,
                        liquidityPoolId: _state.static.displayId,
                        type: ErrorTransactionType.OpenPosition,
                    })
                },
            })
        }
        if (!solanaTx) {
            throw new MissingSolanaTxParamException({
                botId: bot.id,
                type: ErrorTransactionType.OpenPosition,
            })
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
                    })
                this.winstonService.log(
                    WinstonLog.OpenPositionTransactionExecuted,
                    {
                        botId: bot.id,
                        txHash: txHash.toString(),
                        liquidityPoolId: _state.static.displayId,
                    }
                )
                return {
                    positionId 
                }
            },
        })
    }

    async confirm(
        {   
            state,
            positionId,
        }: ConfirmOpenPositionParams
    ): Promise<ConfirmOpenPositionResult> {
        return await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Http,
            callback: async ({ rpc }) => {
                const positionInfo = await fetchEncodedAccount(
                    rpc, 
                    address(positionId),
                    {
                        commitment: "confirmed",
                    })
                if (!positionInfo || !positionInfo.exists) {
                    throw new SolanaAccountNotFoundException({
                        name: ErrorSolanaAccountName.PersonalPosition,
                        address: positionId,
                        dexId: DexId.Meteora,
                        liquidityPoolId: state.static.displayId,    
                    })
                }
                return {
                    // temporary empty, will need other logic to get liquidity
                }
            },
        })
    }
}
