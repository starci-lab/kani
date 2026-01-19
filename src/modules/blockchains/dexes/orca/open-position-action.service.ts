import {
    Injectable 
} from "@nestjs/common"
import {
    IOpenActionService,
    ClmmLiquidityPoolState,
    PrepareOpenPositionParams,
    PrepareOpenPositionResult,
    ExecuteOpenPositionParams,
    ExecuteOpenPositionResult,
    ConfirmOpenPositionParams,
    ConfirmOpenPositionResult,
} from "../../interfaces"
import {
    SignerService 
} from "../../signers"
import {
    AppVersion, DexId, OrcaPositionMetadata, PrimaryMemoryStorageService 
} from "@modules/databases"
import { 
    InvalidPoolTokensException, 
    SnapshotBalancesNotSetException,
    TransactionNotExecutedException,
    ErrorTransactionType,
    SolanaAccountNotFoundException,
    ErrorSolanaAccountName,
    MissingSolanaTxParamException,
    MissingPositionIdParamException,
    EncryptedPrivySignerPrivateKeyNotFoundException,
    PrivyMetadataNotFoundException,
} from "@modules/exceptions"
import {
    TickMathService 
} from "../../math"
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
    assertIsTransactionWithinSizeLimit,
    assertIsSendableTransaction,
    createNoopSigner,
    address,
    signature,
    fetchEncodedAccount,
    partiallySignTransaction,
} from "@solana/kit"
import BN from "bn.js"
import { 
    OpenPositionInstructionService 
} from "./transactions"
import {
    adjustSlippage 
} from "@modules/utils"
import {
    WinstonLog, WinstonService 
} from "@modules/winston"
import Decimal from "decimal.js"
import {
    RpcExecutorService 
} from "../../clients"
import {
    RpcAccessType 
} from "@modules/filesystem"
import {
    envConfig 
} from "@modules/env"
import {
    Position 
} from "./beets"
import {
    PrivySignService 
} from "@modules/privy"
import {
    ClmmLiquidityFormulaService,
    ClmmTickFormulaService 
} from "@modules/blockchains"

@Injectable()
export class OrcaOpenPositionActionService implements IOpenActionService {
    constructor(
        private readonly signerService: SignerService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly tickMathService: TickMathService,
        private readonly openPositionInstructionService: OpenPositionInstructionService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly privySignService: PrivySignService,
        private readonly winstonService: WinstonService,
        private readonly clmmTickFormulaService: ClmmTickFormulaService,
        private readonly clmmLiquidityFormulaService: ClmmLiquidityFormulaService,
    ) { }

    async prepare(
        {
            state,
            bot,
        }: PrepareOpenPositionParams
    ): Promise<PrepareOpenPositionResult> {
        const _state = state as ClmmLiquidityPoolState
        const targetIsA = bot.targetToken.toString() === _state.static.tokenA.toString()
        if (!bot.snapshots) {
            throw new SnapshotBalancesNotSetException({
                botId: bot.id,
            })
        }
        const snapshotTargetBalanceAmount = new BN(bot.snapshots.targetBalanceAmount)
        const snapshotQuoteBalanceAmount = new BN(bot.snapshots.quoteBalanceAmount)
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: _state.static.tokenA.toString(),
        })
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: _state.static.tokenB.toString(),
        })
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: _state.static.displayId,
            })
        }
        const { 
            tickLower, 
            tickUpper
        } = await this.tickMathService.getTickBounds({
            state: _state,
            bot,
        })
        const amountA = targetIsA ? new BN(snapshotTargetBalanceAmount) : new BN(snapshotQuoteBalanceAmount)
        const amountB = targetIsA ? new BN(snapshotQuoteBalanceAmount) : new BN(snapshotTargetBalanceAmount)
        const liquidityRaw = this.clmmLiquidityFormulaService.computeLiquidity({
            tickLower,
            tickUpper,
            tickCurrent: new Decimal(_state.dynamic.tickCurrent.toString()),
            amountA,
            amountB,
        })
        // no slippage for orca
        const liquidity = adjustSlippage(liquidityRaw,
            new Decimal(envConfig().dexes.orca.openPosition.slippage))
        const {
            mintKeyPair,
            ataAddress,
            instructions: openPositionInstructions,
            feeAmountA,
            feeAmountB,
            personalPosition,
        } = await this.openPositionInstructionService.createOpenPositionInstructions({
            bot,
            state: _state,
            liquidity,
            amountA,
            amountB,
            tickLower,
            tickUpper,
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
                            const signedTransaction = await signTransaction(
                                [signer.keyPair, 
                                    mintKeyPair.keyPair]
                                , transaction
                            )
                            const transactionSignature = getSignatureFromTransaction(signedTransaction)
                            assertIsSendableTransaction(signedTransaction)
                            assertIsTransactionWithinSizeLimit(signedTransaction)
                            const txHash = transactionSignature.toString()
                            // get the orca position metadata
                            const metadata: OrcaPositionMetadata = {
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
                    const partialSignedTransaction = await partiallySignTransaction([mintKeyPair.keyPair],
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
                    const metadata: OrcaPositionMetadata = {
                        nftMintAddress: mintKeyPair.address.toString(),
                        ataAddress: ataAddress.toString(),
                    }
                    return {
                        txHash: signedTransaction.txHash,
                        solanaTx: signedTransaction.signedTransaction,
                        feeAmountA,
                        feeAmountB,
                        tickLower,
                        tickUpper,
                        amountA,
                        amountB,
                        metadata,
                        positionId: personalPosition.toString(),
                    }
                }
            },
        })
    }

    async execute({
        bot,
        state,
        isRetry,
        txHash,
        solanaTx,
        positionId,
    }: ExecuteOpenPositionParams): Promise<ExecuteOpenPositionResult> {
        if (!positionId) {
            throw new MissingPositionIdParamException({
                botId: bot.id,
                liquidityPoolId: state.static.displayId,
            })
        }
        const _state = state as ClmmLiquidityPoolState
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
                    }
                )
                this.winstonService.log(
                    WinstonLog.OpenPositionTransactionExecuted,
                    {
                        botId: bot.id,
                        txHash,
                        liquidityPoolId: _state.static.displayId,
                    }
                )
                return {
                    positionId: positionId.toString(),
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
                        dexId: DexId.Orca,
                        liquidityPoolId: state.static.displayId,
                    })
                }
                const [positionState] = Position.struct.deserialize(Buffer.from(positionInfo.data),
                    8)
                return {
                    liquidity: new BN(positionState.liquidity.toString()),
                }
            },
        })
    }
}

