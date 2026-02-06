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
    MissingPositionIdParamException,
    ErrorTransactionType,
    SolanaAccountNotFoundException,
    ErrorSolanaAccountName,
    EncryptedPrivySignerPrivateKeyNotFoundException,
    PrivyMetadataNotFoundException,
    ActivePositionNotFoundException,
    PositionClmmStateNotFoundException,
    LiquidityPoolClmmStateNotFoundException,
    MissingSolanaTxParamException,
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
    getBase64EncodedWireTransaction,
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

/**
 * Service responsible for opening positions on Raydium DEX.
 * Handles position creation, transaction preparation, validation, and execution.
 *
 * @example
 * const service = new RaydiumOpenPositionActionService(...)
 * const result = await service.prepare({ bot, state })
 */
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
     * Prepares an open position transaction.
     * Validates state, calculates amounts, builds transaction, and signs it.
     *
     * @param param - Parameters for preparing open position
     * @param param.bot - Bot schema
     * @param param.state - CLMM liquidity pool state
     * @returns Prepared transaction with position details
     * @throws {ActivePositionNotFoundException} If active position context is missing
     * @throws {LiquidityPoolClmmStateNotFoundException} If CLMM state is missing for the pool
     * @throws {PositionClmmStateNotFoundException} If CLMM state is missing for the active position
     * @throws {BalanceSnapshotsNotFoundException} If balance snapshots are missing
     * @throws {InvalidPoolTokensException} If pool token metadata is missing
     * @throws {PrivyMetadataNotFoundException} If Privy metadata is not found for V2 bots
     * @throws {EncryptedPrivySignerPrivateKeyNotFoundException} If encrypted Privy signer private key is not found for V2 bots
     */
    async prepare({
        state,
        bot,
    }: PrepareOpenPositionParams): Promise<PrepareOpenPositionResult> {
        const _state = state as ClmmLiquidityPoolState

        // Determine if target token is token A
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

        // Extract balance amounts from snapshots
        const {
            targetBalanceAmount: snapshotTargetBalanceAmount,
            quoteBalanceAmount: snapshotQuoteBalanceAmount
        } = bot.balanceSnapshots
        const snapshotTargetBalanceAmountBN = new BN(snapshotTargetBalanceAmount)
        const snapshotQuoteBalanceAmountBN = new BN(snapshotQuoteBalanceAmount)

        // Find token metadata
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

        // Find optimal tick range based on balance amounts
        const {
            tickLower,
            tickUpper,
            liquidity,
        } = await this.tickMathService.findOptimalTickRange({
            tickCurrent: _state.dynamic.tickCurrent,
            tickSpacing: new Decimal(_state.static.clmmState.tickSpacing),
            tickMultiplier: new Decimal(_state.static.clmmState.tickMultiplier),
            targetBalanceAmount: snapshotTargetBalanceAmountBN,
            quoteBalanceAmount: snapshotQuoteBalanceAmountBN,
            targetIsA,
        })

        // Calculate amounts based on target token
        const amountA = targetIsA ? snapshotTargetBalanceAmountBN : snapshotQuoteBalanceAmountBN
        const amountB = targetIsA ? snapshotQuoteBalanceAmountBN : snapshotTargetBalanceAmountBN

        // Adjust liquidity for slippage
        const liquidityAdjusted = adjustSlippage({
            bn: liquidity,
            slippage: new Decimal(envConfig().dexes.raydium.openPosition.slippage),
            isRoundUp: false,
        })

        // Create open position instructions
        const {
            instructions: openPositionInstructions,
            positionKeyPair: mintKeyPair,
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
                            // Sign transaction with V1 signer and mint keypair
                            const signedTransaction = await signTransaction([signer.keyPair,
                                mintKeyPair.keyPair],
                            transaction)
                            const transactionSignature = getSignatureFromTransaction(signedTransaction)
                            const txHash = transactionSignature.toString()

                            // Validate transaction before returning
                            assertIsSendableTransaction(signedTransaction)
                            assertIsTransactionWithinSizeLimit(signedTransaction)

                            // Get the Raydium position metadata
                            const metadata: RaydiumPositionMetadata = {
                                nftMintAddress: mintKeyPair.address.toString(),
                                ataAddress: ataAddress.toString(),
                            }
                            return {
                                prepareTxs: [{
                                    txHash,
                                    solanaTx: signedTransaction,
                                }],
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

                    // Partially sign with mint keypair, then sign with Privy
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

                    // Get the Raydium position metadata
                    const metadata: RaydiumPositionMetadata = {
                        nftMintAddress: mintKeyPair.address.toString(),
                        ataAddress: ataAddress.toString(),
                    }
                    return {
                        prepareTxs: [{
                            txHash: signedTransaction.txHash.toString(),
                            solanaTx: signedTransaction.signedTransaction,
                        }],
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

    /**
     * Executes an open position transaction.
     * Handles transaction checking, stimulation, and execution.
     *
     * @param param - Parameters for executing open position
     * @param param.bot - Bot schema
     * @param param.state - CLMM liquidity pool state
     * @param param.txCheck - Whether to check if transaction already exists
     * @param param.positionId - Position ID to confirm
     * @param param.prepareTxs - Array of prepared transactions
     * @param param.stimulate - Whether to simulate transaction execution
     * @returns Execution result with position ID and transaction hashes
     * @throws {MissingPositionIdParamException} If position ID is missing
     * @throws {MissingSolanaTxParamException} If the Solana transaction is missing
     */
    async execute({
        txCheck,
        stimulate,
        prepareTxs,
        positionId,
        bot,
        state,
    }: ExecuteOpenPositionParams): Promise<ExecuteOpenPositionResult> {
        // Stage: input validation (position ID must be provided)
        if (!positionId) {
            throw new MissingPositionIdParamException({
                botId: bot.id,
                liquidityPoolId: state.static.displayId,
            })
        }
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
                                encoding: "base58" 
                            }
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
                            liquidityPoolId: state.static.displayId,
                        }
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
                            }).send()

                        // If simulation succeeds, log and continue
                        if (!transaction.value.err) {
                            this.winstonService.log(
                                WinstonLog.OpenPositionTransactionStimulated,
                                {
                                    botId: bot.id,
                                    txHash: prepareTx.txHash,
                                    liquidityPoolId: state.static.displayId,
                                }
                            )
                            txHashes.push(prepareTx.txHash)
                            return
                        }
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
                        }
                    )

                    // Log successful execution
                    this.winstonService.log(
                        WinstonLog.OpenPositionTransactionExecuted,
                        {
                            botId: bot.id,
                            txHash: prepareTx.txHash,
                            liquidityPoolId: state.static.displayId,
                        }
                    )
                    txHashes.push(prepareTx.txHash)
                },
            })
        }
        return {
            positionId: positionId.toString(),
            txHashes,
        }
    }

    /**
     * Confirms an open position by fetching position account from chain.
     *
     * @param param - Parameters for confirming open position
     * @param param.state - CLMM liquidity pool state
     * @param param.positionId - Position account address
     * @returns Confirmation result with position liquidity
     * @throws {SolanaAccountNotFoundException} If position account is not found on-chain
     */
    async confirm({
        positionId,
        state,
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
                        address: positionId.toString(),
                        dexId: DexId.Raydium,
                        liquidityPoolId: state.static.displayId,
                    })
                }

                // Deserialize position state (skip 8-byte discriminator)
                const [personalPositionState] = PersonalPositionState.struct.deserialize(Buffer.from(positionInfo.data),
                    8)
                return {
                    liquidity: new BN(personalPositionState.liquidity.toString()),
                }
            },
        })
    }
}

