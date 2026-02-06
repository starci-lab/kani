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
    BalanceSnapshotsNotFoundException,
    ErrorTransactionType,
    MissingSolanaTxParamException,
    SolanaAccountNotFoundException,
    ErrorSolanaAccountName,
    ActivePositionNotFoundException,
    TransactionValidationFailedException,
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
        bot,
    }: PrepareOpenPositionParams): Promise<PrepareOpenPositionResult> {
        const _state = state as DlmmLiquidityPoolState
        const targetIsA = bot.targetToken.toString() === _state.static.tokenA.toString()

        // Stage: state validation (open-position requires an active position context)
        if (!bot.activePosition || !bot.activePosition.associatedPosition) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }
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
                $eq: _state.static.tokenA.toString(),
            },
        })
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: _state.static.tokenB.toString(),
            },
        })
        // Stage: state validation (pool token metadata must exist)
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: _state.static.displayId,
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
        })

        return await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Write,
            callback: async ({ rpc }) => {
                // Get latest blockhash for transaction lifetime
                const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()

                // Build transaction message
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
                            // Sign transaction with V1 signer and position keypair
                            const signedTransaction = await signTransaction([signer.keyPair,
                                positionKeyPair.keyPair],
                            transaction)

                            // Validate transaction before returning
                            assertIsSendableTransaction(signedTransaction)
                            assertIsTransactionWithinSizeLimit(signedTransaction)
                            const transactionSignature = getSignatureFromTransaction(signedTransaction)
                            const txHash = transactionSignature.toString()
                            return {
                                prepareTxs: [{
                                    txHash,
                                    solanaTx: signedTransaction,
                                }],
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
                        prepareTxs: [{
                            txHash: signedTransaction.txHash,
                            solanaTx: signedTransaction.signedTransaction,
                        }],
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
        state,
        txCheck,
        positionId,
        stimulate,
        prepareTxs,
    }: ExecuteOpenPositionParams): Promise<ExecuteOpenPositionResult> {
        // Stage: input validation (position ID must be provided)
        if (!positionId) {
            throw new MissingPositionIdParamException({
                botId: bot.id,
                liquidityPoolId: state.static.displayId,
            })
        }
        const _state = state as DlmmLiquidityPoolState
        const txHashes: Array<string> = []

        // Process each prepared transaction
        for (const prepareTx of prepareTxs) {
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
                            liquidityPoolId: _state.static.displayId,
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
                    type: ErrorTransactionType.OpenPosition,
                })
            }

            await this.rpcExecutorService.withSolanaRpc({
                accessType: RpcAccessType.Write,
                callback: async ({ rpc, rpcSubscriptions }) => {
                    if (stimulate) {
                        // Simulate transaction execution
                        const transaction = await rpc.simulateTransaction(
                            getBase64EncodedWireTransaction(solanaTx),
                            {
                                encoding: "base64",
                                commitment: "confirmed",
                            },
                        ).send()

                        // Stage: transaction stimulation validation
                        if (transaction.value.err) {
                            throw new TransactionValidationFailedException({
                                botId: bot.id,
                                txHash: prepareTx.txHash,
                                type: ErrorTransactionType.OpenPosition,
                            })
                        }

                        // Log successful simulation
                        this.winstonService.log(
                            WinstonLog.OpenPositionTransactionStimulated,
                            {
                                botId: bot.id,
                                txHash: prepareTx.txHash,
                                liquidityPoolId: _state.static.displayId,
                            },
                        )
                        txHashes.push(prepareTx.txHash)
                        return
                    }

                    // Execute transaction on-chain
                    const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
                        rpc,
                        rpcSubscriptions,
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
                            liquidityPoolId: _state.static.displayId,
                        },
                    )
                    txHashes.push(prepareTx.txHash)
                },
            })
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
        state,
        positionId,
    }: ConfirmOpenPositionParams): Promise<ConfirmOpenPositionResult> {
        return await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Http,
            callback: async ({ rpc }) => {
                // Fetch position account from chain
                const positionInfo = await fetchEncodedAccount(
                    rpc, 
                    address(positionId),
                    {
                        commitment: "confirmed",
                    })

                // Stage: on-chain fetch validation (position account must exist)
                if (!positionInfo || !positionInfo.exists) {
                    throw new SolanaAccountNotFoundException({
                        name: ErrorSolanaAccountName.PersonalPosition,
                        address: positionId,
                        dexId: DexId.Meteora,
                        liquidityPoolId: state.static.displayId,    
                    })
                }
                return {
                    // Temporary empty, will need other logic to get liquidity
                }
            },
        })
    }
}
