import {
    Injectable
} from "@nestjs/common"
import {
    PrepareWithdrawTransactionParams,
    PrepareWithdrawTransactionResult,
    SignWithdrawTransactionParams,
    SignWithdrawTransactionResult,
} from "../types"
import {
    ExecuteWithdrawTransactionParams,
    ExecuteWithdrawTransactionResult,
} from "../types"
import {
    TokenId,
    TransactionType,
} from "@modules/databases"
import {
    TokenNotFoundException,
} from "@modules/exceptions"
import {
    getCompiledTransactionMessageDecoder,
    getTransactionDecoder,
    getBase64Encoder,
    decompileTransactionMessageFetchingLookupTables,
    address,
    Instruction,
} from "@solana/kit"
import {
    SolanaAggregatorSelectorService
} from "../../aggregators"
import {
    RpcExecutorService,
    SolanaTxService,
    SolanaFetchService,
    SolanaStimulateService,
    SolanaExecuteService,
} from "@modules/blockchains"
import {
    RpcAccessType
} from "@modules/filesystem"
import {
    TransferInstructionService,
} from "../../tx-builder"
import {
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    InjectSuperJson
} from "@modules/mixin"
import {
    ChainId
} from "@modules/common"
import {
    SuperJSON
} from "superjson"

/**
 * Service for handling withdraw transactions on Solana.
 * Supports withdrawing tokens directly or converting to USDC before withdrawal.
 *
 * @example
 * const service = new SolanaWithdrawActionService(...)
 * const prepareTxs = await service.prepare({ bot, tokenInputs, toAddress })
 * const txHash = await service.execute({ bot, signedTx })
 */
@Injectable()
export class SolanaWithdrawActionService {
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly solanaAggregatorSelectorService: SolanaAggregatorSelectorService,
        private readonly solanaTxService: SolanaTxService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        private readonly transferInstructionService: TransferInstructionService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly solanaFetchService: SolanaFetchService,
        private readonly solanaStimulateService: SolanaStimulateService,
        private readonly solanaExecuteService: SolanaExecuteService,
    ) { }

    /**
     * Prepares withdraw transactions.
     * Optionally converts tokens to USDC before withdrawal.
     *
     * @param param - Parameters for preparing withdraw transaction
     * @returns Prepared transactions ready for execution
     *
     * @example
     * const prepareTx = await service.prepare({ bot, tokenInputs, toAddress, toUsdc: true })
     */
    public async prepare(
        {
            bot,
            tokenInputs,
            toAddress,
            toUsdc = false
        }: PrepareWithdrawTransactionParams):
        Promise<PrepareWithdrawTransactionResult> {
        const instructions: Array<Instruction> = []
        for (const tokenInput of tokenInputs) {
            if (toUsdc) {
                // find USDC token
                const usdcToken = this.primaryMemoryStorageService.tokenCollection.findOne({
                    displayId: {
                        $eq: TokenId.SolUsdc,
                    }
                })
                if (!usdcToken) {
                    throw new TokenNotFoundException({
                        displayId: TokenId.SolUsdc,
                    })
                }

                // swap to USDC if token is not already USDC
                if (tokenInput.token.displayId !== TokenId.SolUsdc) {
                    const { response: { payload: serializedTransaction } } = await this.solanaAggregatorSelectorService.batchQuote({
                        tokenIn: tokenInput.token,
                        tokenOut: usdcToken,
                        amountIn: tokenInput.amount,
                        senderAddress: bot.accountAddress,
                    })
                    // decode and decompile swap transaction
                    const swapTransactionBytes = getBase64Encoder().encode(serializedTransaction as string)
                    const swapTransaction = getTransactionDecoder().decode(swapTransactionBytes)
                    const compiledSwapTransactionMessage = getCompiledTransactionMessageDecoder().decode(
                        swapTransaction.messageBytes,
                    )
                    const swapTransactionMessage = await this.rpcExecutorService.withSolanaRpc({
                        accessType: RpcAccessType.Http,
                        callback: async ({ rpc }) => {
                            return await decompileTransactionMessageFetchingLookupTables(
                                compiledSwapTransactionMessage,
                                rpc
                            )
                        },
                    })

                    // add swap instructions
                    const swapInstructions = swapTransactionMessage.instructions
                    instructions.push(...swapInstructions)
                }
            } else {
                // find target token for conversion
                const targetToken = this.primaryMemoryStorageService.tokenCollection.findOne({
                    id: {
                        $eq: tokenInput.token.displayId,
                    }
                })
                if (!targetToken) {
                    throw new TokenNotFoundException({
                        displayId: tokenInput.token.displayId,
                    })
                }

                // swap to target token if needed
                if (tokenInput.token.displayId !== targetToken.displayId) {
                    const { response: { payload: serializedTransaction } } = await this.solanaAggregatorSelectorService.batchQuote({
                        tokenIn: tokenInput.token,
                        tokenOut: targetToken,
                        amountIn: tokenInput.amount,
                        senderAddress: bot.accountAddress,
                    })

                    // decode and decompile swap transaction
                    const swapTransactionBytes = getBase64Encoder().encode(serializedTransaction as string)
                    const swapTransaction = getTransactionDecoder().decode(swapTransactionBytes)
                    const compiledSwapTransactionMessage = getCompiledTransactionMessageDecoder().decode(
                        swapTransaction.messageBytes,
                    )
                    const swapTransactionMessage = await this.rpcExecutorService.withSolanaRpc({
                        accessType: RpcAccessType.Http,
                        callback: async ({ rpc }) => {
                            return await decompileTransactionMessageFetchingLookupTables(
                                compiledSwapTransactionMessage,
                                rpc
                            )
                        },
                    })

                    // add swap instructions
                    const swapInstructions = swapTransactionMessage.instructions
                    instructions.push(...swapInstructions)
                }
            }

            // create transfer instructions
            const { instructions: transferInstructions } = await this.transferInstructionService.createTransferInstructions({
                fromAddress: address(bot.accountAddress),
                toAddress: address(toAddress),
                amount: tokenInput.amount,
                token: tokenInput.token,
            })
            instructions.push(...transferInstructions)
        }  
        return {
            prepareTxs: [
                {
                    chainId: ChainId.Solana,
                    serializedTx: this.superJson.stringify(instructions),
                }
            ],
        }
    }

    /**
     * Signs a withdraw transaction.
     * Validates state, builds transaction, and signs it.
     *
     * @param param - Parameters for signing withdraw transaction
     * @param param.bot - Bot schema
     * @param param.prepareTx - Prepared transaction
     * @returns Signed transaction
     */
    async sign({
        bot,
        prepareTx,
    }: SignWithdrawTransactionParams)
    : Promise<SignWithdrawTransactionResult> {
        return {
            signedTx: await this.solanaTxService.signTx(
                {
                    bot,
                    prepareTx,
                    transactionType: TransactionType.Withdraw,
                }
            ),
        }
    }

    /**
     * Executes withdraw transactions.
     *
     * @param param - Parameters for executing withdraw transaction
     * @returns Array of transaction hashes
     *
     * @example
     * const txHash = await service.execute({ bot, signedTx })
     */
    public async execute({ 
        bot, 
        signedTx, 
        txCheck = false, 
        stimulate = false 
    }: ExecuteWithdrawTransactionParams): Promise<ExecuteWithdrawTransactionResult> {
        if (txCheck && !stimulate) {
            const transaction = await this.solanaFetchService.fetchTransaction({
                txHash: signedTx.txHash,
            })
            if (transaction) {
                return {
                    txHash: signedTx.txHash,
                }
            }
        }
        if (stimulate) {
            const { txHash } = await this.solanaStimulateService.stimulate({
                signedTx,
                bot,
                transactionType: TransactionType.Withdraw,
            })
            return {
                txHash,
            }
        }
        const { txHash } = await this.solanaExecuteService.execute({
            signedTx,
            bot,
            transactionType: TransactionType.Withdraw,
        })
        return {
            txHash,
        }
    }
}