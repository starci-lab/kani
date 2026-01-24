import {
    Injectable 
} from "@nestjs/common"
import {
    IOpenActionService,
    ClmmLiquidityPoolState,
    PrepareOpenPositionParams,
    PrepareOpenPositionResult,
    ExecuteOpenPositionParams,
    ConfirmOpenPositionParams,
    ExecuteOpenPositionResult,
    ConfirmOpenPositionResult,
} from "../../interfaces"
import {
    SignerService 
} from "../../signers"
import {
    AppVersion, DexId, PrimaryMemoryStorageService, RaydiumPositionMetadata 
} from "@modules/databases"
import { 
    InvalidPoolTokensException, 
    BalanceSnapshotsNotFoundException,
    TransactionNotPreparedException,
    TransactionNotExecutedException,
    MissingPositionIdParamException,
    ErrorTransactionType,
    SolanaAccountNotFoundException,
    ErrorSolanaAccountName,
    EncryptedPrivySignerPrivateKeyNotFoundException,
    PrivyMetadataNotFoundException,
    ActivePositionNotFoundException,
    PositionClmmStateNotFoundException,
    LiquidityPoolClmmStateNotFoundException,
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
    assertIsSendableTransaction,
    assertIsTransactionWithinSizeLimit,
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
    PersonalPositionState 
} from "./beets"
import {
    PrivySignService 
} from "@modules/privy"
import {
    adjustSlippage 
} from "@modules/utils"
import {
    envConfig 
} from "@modules/env"

@Injectable()
export class RaydiumOpenPositionActionService implements IOpenActionService {
    constructor(
        private readonly signerService: SignerService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly tickMathService: TickMathService,
        private readonly openPositionInstructionService: OpenPositionInstructionService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly privySignService: PrivySignService,
        private readonly winstonService: WinstonService,
    ) { }

    /**
     * === Error-handling convention (DEX action services) ===
     *
     * Stages in this service:
     * - Input validation: required params missing/invalid (throw immediately)
     * - State validation: required bot/pool/position state missing (throw immediately)
     * - On-chain fetch: RPC account fetch fails or returns null (throw)
     * - Transaction building: instruction/message/signing validation fails (throw)
     * - Execution: tx not executed / retry checks fail (throw)
     * - Event parsing: required tx fields are missing (throw)
     *
     * Business logic unchanged; comments + throw structure only.
     */

    async prepare(
        {
            state,
            bot,
        }: PrepareOpenPositionParams
    ): Promise<PrepareOpenPositionResult> {
        const _state = state as ClmmLiquidityPoolState
        const targetIsA = bot.targetToken.toString() === _state.static.tokenA.toString()
        // Stage: state validation (open-position requires an active position context)
        if (!bot.activePosition || !bot.activePosition.associatedPosition) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }
        // Stage: state validation (pool must have CLMM static state)
        if (!_state.static.clmmState) {
            throw new LiquidityPoolClmmStateNotFoundException({
                liquidityPoolId: _state.static.displayId,
            })
        }
        // Stage: state validation (position must have CLMM state recorded)
        if (!bot.activePosition.associatedPosition.clmmState) {
            throw new PositionClmmStateNotFoundException({
                positionId: bot.activePosition.associatedPosition.positionId,
                botId: bot.id,
            })
        }
        // Stage: state validation (requires balance snapshots for sizing / tick math)
        if (!bot.balanceSnapshots) {
            throw new BalanceSnapshotsNotFoundException({
                botId: bot.id,
            })
        }
        const snapshotTargetBalanceAmount = new BN(bot.balanceSnapshots.targetBalanceAmount)
        const snapshotQuoteBalanceAmount = new BN(bot.balanceSnapshots.quoteBalanceAmount)
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: _state.static.tokenA.toString(),
        })
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: _state.static.tokenB.toString(),
        })
        // Stage: state validation (pool token metadata must exist)
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: _state.static.displayId,
            })
        }
        const { 
            tickLower, 
            tickUpper,
            liquidity,
        } = await this.tickMathService.findOptimalTickRange({
            tickCurrent: _state.dynamic.tickCurrent,
            tickSpacing: new Decimal(_state.static.clmmState.tickSpacing),
            tickMultiplier: new Decimal(_state.static.clmmState.tickMultiplier),
            targetBalanceAmount: new BN(snapshotTargetBalanceAmount),
            quoteBalanceAmount: new BN(snapshotQuoteBalanceAmount),
            targetIsA,
        })
        const amountA = targetIsA ? new BN(snapshotTargetBalanceAmount) : new BN(snapshotQuoteBalanceAmount)
        const amountB = targetIsA ? new BN(snapshotQuoteBalanceAmount) : new BN(snapshotTargetBalanceAmount)
        const liquidityAdjusted = adjustSlippage({
            bn: liquidity,
            slippage: new Decimal(envConfig().dexes.raydium.openPosition.slippage),
            isRoundUp: false,
        })
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
            liquidity: liquidityAdjusted,
            amountAMax: amountA,
            amountBMax: amountB,
            tickLower,
            tickUpper,
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
                                mintKeyPair.keyPair],
                            transaction)
                            const transactionSignature = getSignatureFromTransaction(signedTransaction)
                            const txHash = transactionSignature.toString()
                            assertIsSendableTransaction(signedTransaction)
                            assertIsTransactionWithinSizeLimit(signedTransaction)   
                            const metadata: RaydiumPositionMetadata = {
                                nftMintAddress: mintKeyPair.address.toString(),
                                ataAddress: ataAddress.toString(),
                            }
                            return {
                                txHash,
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
                    const metadata: RaydiumPositionMetadata = {
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
        isRetry,
        txHash,
        solanaTx,
        positionId,
        bot,
        state,
    }: ExecuteOpenPositionParams): Promise<ExecuteOpenPositionResult> {
        if (!positionId) {
            throw new MissingPositionIdParamException({
                botId: bot.id,
                liquidityPoolId: state.static.displayId,
            })
        }
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
                        liquidityPoolId: state.static.displayId,
                        type: ErrorTransactionType.OpenPosition,
                    })
                },
            })  
        }
        if (!solanaTx) {
            throw new TransactionNotPreparedException({
                botId: bot.id,
                txHash,
                liquidityPoolId: state.static.displayId,
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
                        liquidityPoolId: state.static.displayId,
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
            state,
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
                        address: positionId.toString(),
                        dexId: DexId.Raydium,
                        liquidityPoolId: state.static.displayId,
                    })
                }
                const [personalPositionState] = PersonalPositionState.struct.deserialize(Buffer.from(positionInfo.data),
                    8)
                return {
                    liquidity: new BN(personalPositionState.liquidity.toString()),
                }
            },
        })
    }
}

