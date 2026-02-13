import {
    Injectable
} from "@nestjs/common"
import {
    IOpenActionService,
    PrepareOpenPositionParams,
    PrepareOpenPositionResult,
    ExecuteOpenPositionParams,
    ExecuteOpenPositionResult,
    ConfirmOpenPositionResult,
    ConfirmOpenPositionParams,
} from "../types"
import {
    DlmmLiquidityPoolState,
    PrepareTx,
} from "../../types"
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
    BalanceSnapshotsNotFoundException,
    TransactionType,
    MissingSolanaTxParamException,
    SolanaAccountNotFoundException,
    ErrorSolanaAccountKind,
    TransactionSubmitFailedException,
    TransactionStimulatedFailedException,
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
    getBase64EncodedWireTransaction,
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
import { ChainId } from "@modules/common"

/**
 * Service responsible for opening positions on Meteora DEX.
 * Handles position creation, transaction preparation, validation, and execution.
 *
 * @example
 * const service = new MeteoraOpenPositionActionService(...)
 * const result = await service.prepare({ bot, state })
 */
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

    /**
     * Prepares an open position transaction.
     * Validates state, calculates amounts, builds transaction, and signs it.
     *
     * @param param - Parameters for preparing open position
     * @param param.bot - Bot schema
     * @param param.state - DLMM liquidity pool state
     * @returns Prepared transaction with position details
     * @throws {ActivePositionNotFoundException} If no active position context is found for the bot
     * @throws {BalanceSnapshotsNotFoundException} If balance snapshots are missing
     * @throws {InvalidPoolTokensException} If pool token metadata is missing
     * @throws {PrivyMetadataNotFoundException} If Privy metadata is not found for V2 bots
     * @throws {EncryptedPrivySignerPrivateKeyNotFoundException} If encrypted Privy signer private key is not found for V2 bots
     */
    async prepare({
        state,
        liquidityPool,
        bot,
    }: PrepareOpenPositionParams): Promise<PrepareOpenPositionResult> {
        const _state = state as DlmmLiquidityPoolState
        const targetIsA = bot.targetToken.toString() === liquidityPool.tokenA.toString()
        // Stage: state validation (requires balance snapshots for sizing)
        if (!bot.balanceSnapshots) {
            throw new BalanceSnapshotsNotFoundException({
                botId: bot.id,
            })
        }

        // Extract balance amounts from snapshots
        const {
            targetBalanceAmount: snapshotTargetBalanceAmount,
            quoteBalanceAmount: snapshotQuoteBalanceAmount
        } = bot.balanceSnapshots
        const snapshotTargetBalanceAmountBN = new BN(snapshotTargetBalanceAmount)
        const snapshotQuoteBalanceAmountBN = new BN(snapshotQuoteBalanceAmount)

        // Find token metadata
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: liquidityPool.tokenA.toString(),
            },
        })
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: liquidityPool.tokenB.toString(),
            },
        })
        // Stage: state validation (pool token metadata must exist)
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: liquidityPool.displayId,
            })
        }

        // Calculate amounts based on target token
        const amountA = targetIsA ? snapshotTargetBalanceAmountBN : snapshotQuoteBalanceAmountBN
        const amountB = targetIsA ? snapshotQuoteBalanceAmountBN : snapshotTargetBalanceAmountBN

        // Create open position instructions
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
            liquidityPool,
        })

        const lastedBlockhashResult = await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Http,
            callback: async ({ rpc }) => {
                // Get latest blockhash for transaction lifetime
                return await rpc.getLatestBlockhash().send()
            }
        })
        // Build transaction message
        const transactionMessage = pipe(
            createTransactionMessage({
                version: 0
            }),
            (tx) => setTransactionMessageFeePayerSigner(createNoopSigner(address(bot.accountAddress)),
                tx),
            (tx) => appendTransactionMessageInstructions(openPositionInstructions,
                tx),
            (tx) => setTransactionMessageLifetimeUsingBlockhash(lastedBlockhashResult.value,
                tx),
        )
        const transaction = compileTransaction(transactionMessage)
        let prepareTx: PrepareTx
        if (bot.version === AppVersion.V1) {
            const { txHash, solanaTx } = await this.signerService.withSolanaSigner({
                bot,
                action: async (signer) => {
                    // Sign transaction with V1 signer and position keypair
                    const signedTransaction = await signTransaction([signer.keyPair,
                        positionKeyPair.keyPair],
                    transaction)
                    const transactionSignature = getSignatureFromTransaction(signedTransaction)
                    const txHash = transactionSignature.toString()
                    return {
                        txHash,
                        solanaTx: signedTransaction,
                    }
                }
            })
            assertIsSendableTransaction(solanaTx)
            assertIsTransactionWithinSizeLimit(solanaTx)
            prepareTx = {
                txHash,
                solanaTx,
            }
            // Stimulate before returning
            const simulateResult = await this.rpcExecutorService.withSolanaRpc({
                accessType: RpcAccessType.Http,
                callback: async ({ rpc }) => {
                    return await rpc.simulateTransaction(
                        getBase64EncodedWireTransaction(solanaTx!),
                        {
                            encoding: "base64",
                            commitment: "confirmed",
                        },
                    ).send()
                },
            })
            if (simulateResult.value.err) {
                throw new TransactionStimulatedFailedException({
                    botId: bot.id,
                    txHash,
                    liquidityPoolId: liquidityPool.displayId,
                    type: TransactionType.OpenPosition,
                    chainId: ChainId.Solana,
                })
            }
        } else {
            // Stage: state validation (Privy signing prerequisites for V2 bots)
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

            // Partially sign with position keypair, then sign with Privy
            const partialSignedTransaction = await partiallySignTransaction(
                [positionKeyPair.keyPair],
                transaction
            )
            const signedTransaction = await this.privySignService.signSolanaTransaction(
                {
                    lifetimeConstraint: {
                        blockhash: lastedBlockhashResult.value.blockhash,
                        lastValidBlockHeight: lastedBlockhashResult.value.lastValidBlockHeight,
                    },
                    transaction: partialSignedTransaction,
                    encryptedPrivySignerPrivateKey: bot.encryptedPrivySignerPrivateKeyPayload,
                    walletId: bot.privyMetadata.walletId,
                }
            )
            // stimulate transaction
            const stimulateTransaction = await this.rpcExecutorService.withSolanaRpc({
                accessType: RpcAccessType.Http,
                callback: async ({ rpc }) => {
                    return await rpc.simulateTransaction(
                        getBase64EncodedWireTransaction(signedTransaction.signedTransaction),
                        {
                            encoding: "base64",
                            commitment: "confirmed",
                        },
                    ).send()
                }
            })
            if (stimulateTransaction.value.err) {
                throw new TransactionStimulatedFailedException(
                    {
                        botId: bot.id,
                        txHash: signedTransaction.txHash,
                        type: TransactionType.OpenPosition,
                        chainId: ChainId.Solana,
                    }
                )
            }
            prepareTx = {
                txHash: signedTransaction.txHash,
                solanaTx: signedTransaction.signedTransaction,
            }
            // Stimulate before returning
            const simulateResult = await this.rpcExecutorService.withSolanaRpc({
                accessType: RpcAccessType.Http,
                callback: async ({ rpc }) => {
                    return await rpc.simulateTransaction(
                        getBase64EncodedWireTransaction(signedTransaction.signedTransaction),
                        {
                            encoding: "base64",
                            commitment: "confirmed",
                        },
                    ).send()
                },
            })
            if (simulateResult.value.err) {
                throw new TransactionStimulatedFailedException({
                    botId: bot.id,
                    txHash: signedTransaction.txHash,
                    liquidityPoolId: liquidityPool.displayId,
                    type: TransactionType.OpenPosition,
                    chainId: ChainId.Solana,
                })
            }
        }
        return {
            prepareTxs: [prepareTx],
            feeAmountA,
            feeAmountB,
            amountA,
            amountB,
            minBinId,
            maxBinId,
            positionId: positionKeyPair.address.toString(),
        }
    }

    /**
     * Executes an open position transaction.
     * Handles transaction checking, stimulation, and execution.
     *
     * @param param - Parameters for executing open position
     * @param param.bot - Bot schema
     * @param param.state - DLMM liquidity pool state
     * @param param.txCheck - Whether to check if transaction already exists
     * @param param.positionId - Position ID to confirm
     * @param param.prepareTxs - Array of prepared transactions
     * @param param.stimulate - Whether to simulate transaction execution
     * @returns Execution result with position ID and transaction hashes
     * @throws {MissingPositionIdParamException} If position ID is missing
     * @throws {MissingSolanaTxParamException} If the Solana transaction is missing
     * @throws {TransactionValidationFailedException} If transaction simulation fails
     */
    async execute({
        bot,
        txCheck,
        positionId,
        stimulate,
        signedTx,
        liquidityPool,
    }: ExecuteOpenPositionParams): Promise < ExecuteOpenPositionResult > {
    // Stage: input validation (position ID must be provided)
        if(!positionId) {
            throw new MissingPositionIdParamException({
                botId: bot.id,
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        const txHashes: Array<string> =[]

        // Stage: transaction checking (if txCheck is enabled and not stimulating)
            if (txCheck && !stimulate) {
                const transaction = await this.rpcExecutorService.withSolanaRpc({
                    accessType: RpcAccessType.Http,
                    callback: async ({ rpc }) => {
                        return await rpc.getTransaction(
                            signature(prepareTx.txHash),
                            {
                                commitment: "confirmed",
                                encoding: "base58",
                                maxSupportedTransactionVersion: 0,
                            },
                        ).send()
                    },
                })

                // If transaction already executed, log and continue
                if (transaction) {
                    this.winstonService.log(
                        WinstonLog.OpenPositionTransactionFound,
                        {
                            botId: bot.id,
                            txHash: prepareTx.txHash,
                            liquidityPoolId: liquidityPool.displayId,
                        },
                    )
                    txHashes.push(prepareTx.txHash)
                    continue
                }
            }

            // Stage: transaction validation (Solana transaction must exist)
            const { solanaTx } = prepareTx
            if (!solanaTx) {
                throw new MissingSolanaTxParamException({
                    botId: bot.id,
                    type: TransactionType.OpenPosition,
                })
            }
            if (stimulate) {
                const transaction = await this.rpcExecutorService.withSolanaRpc({
                    accessType: RpcAccessType.Http,
                    callback: async ({ rpc }) => {
                        return await rpc.simulateTransaction(
                            getBase64EncodedWireTransaction(solanaTx),
                            {
                                encoding: "base64",
                                commitment: "confirmed",
                            },
                        ).send()
                    },
                })
                // Stage: transaction stimulation validation
                if (transaction.value.err) {
                    throw new TransactionSubmitFailedException({
                        message: transaction.value.err.toString(),
                        originalError: new TransactionStimulatedFailedException({
                            botId: bot.id,
                            txHash: prepareTx.txHash,
                            liquidityPoolId: liquidityPool.displayId,
                            type: TransactionType.OpenPosition,
                        })
                    })
                }

                // Log successful simulation
                this.winstonService.log(
                    WinstonLog.OpenPositionTransactionStimulated,
                    {
                        botId: bot.id,
                        txHash: prepareTx.txHash,
                        liquidityPoolId: liquidityPool.displayId,
                    },
                )
                txHashes.push(prepareTx.txHash)
            } else {
                const sendAndConfirmTransaction = await this.rpcExecutorService.withSolanaRpc({
                    accessType: RpcAccessType.Write,
                    callback: async ({ rpc, rpcSubscriptions }) => {
                        return sendAndConfirmTransactionFactory({
                            rpc,
                            rpcSubscriptions,
                        })
                    }
                })
                await sendAndConfirmTransaction(
                    solanaTx,
                    {
                        commitment: "confirmed",
                    },
                )
                // Log successful execution
                this.winstonService.log(
                    WinstonLog.OpenPositionTransactionExecuted,
                    {
                        botId: bot.id,
                        txHash: prepareTx.txHash,
                        liquidityPoolId: liquidityPool.displayId,
                    },
                )
                txHashes.push(prepareTx.txHash)
            }
        }

        return {
            positionId,
            txHashes,
        }
    }

    /**
     * Confirms an open position by fetching position account from chain.
     *
     * @param param - Parameters for confirming open position
     * @param param.state - DLMM liquidity pool state
     * @param param.positionId - Position account address
     * @returns Confirmation result (currently empty, will need other logic to get liquidity)
     * @throws {SolanaAccountNotFoundException} If position account is not found on-chain
     */
    async confirm({
        positionId,
        liquidityPool,
    }: ConfirmOpenPositionParams): Promise < ConfirmOpenPositionResult > {
        const positionInfo = await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Http,
            callback: async ({ rpc }) => {
            // Fetch position account from chain
                return await fetchEncodedAccount(
                    rpc,
                    address(positionId),
                    {
                        commitment: "confirmed",
                    })
            }
        })
        // Stage: on-chain fetch validation (position account must exist)
        if (!positionInfo || !positionInfo.exists) {
            throw new SolanaAccountNotFoundException({
                kind: ErrorSolanaAccountKind.PersonalPosition,
                address: positionId,
                dexId: DexId.Meteora,
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        return {
            // Temporary empty, will need other logic to get liquidity
        }
    }
}
