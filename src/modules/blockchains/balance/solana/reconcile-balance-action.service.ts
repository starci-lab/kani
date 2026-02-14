import {
    Injectable 
} from "@nestjs/common"
import {
    PrepareReconcileBalanceTransactionParams,
    PrepareReconcileBalanceTransactionResult,
    ExecuteReconcileBalanceTransactionParams,
    ExecuteReconcileBalanceTransactionResult,
    SignReconcileBalanceTransactionParams,
    SignReconcileBalanceTransactionResult,
} from "../types"
import {
    PrepareTx,
} from "../../types"
import {
    TransactionType
} from "@modules/databases"
import {
    RpcAccessType 
} from "@modules/filesystem"
import {
    getBase64Encoder, 
    getTransactionDecoder, 
    getCompiledTransactionMessageDecoder, 
    decompileTransactionMessageFetchingLookupTables, 
    Instruction,
} from "@solana/kit"
import {
    SolanaAggregatorSelectorService,
    SolanaTxService,
    SolanaFetchService,
    RpcExecutorService,
    SolanaStimulateService,
    SolanaExecuteService,
} from "@modules/blockchains"
import {
    ChainId 
} from "@modules/common"
import {
    InjectSuperJson 
} from "@modules/mixin"
import {
    SuperJSON 
} from "superjson"

/**
 * Service for handling balance reconciliation on Solana.
 * Orchestrates swap transactions to reconcile balances between tokens.
 *
 * @example
 * const service = new SolanaReconcileBalanceActionService(...)
 * const prepareTxs = await service.prepare({ bot, tokenInputs })
 * const txHashes = await service.execute({ bot, prepareTxs })
 */
@Injectable()
export class SolanaReconcileBalanceActionService {
    constructor(
        private readonly solanaAggregatorSelectorService: SolanaAggregatorSelectorService,
        private readonly solanaTxService: SolanaTxService,
        private readonly solanaFetchService: SolanaFetchService,
        private readonly rpcExecutorService: RpcExecutorService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        private readonly solanaStimulateService: SolanaStimulateService,
        private readonly solanaExecuteService: SolanaExecuteService,
    ) { }

    /**
     * Prepares swap transactions for balance reconciliation.
     * Swaps from tokenIn to tokenOut for each tokenInput.
     *
     * @param param - Parameters for preparing reconcile balance transaction
     * @returns Prepared transactions ready for execution
     *
     * @example
     * const prepareTxs = await service.prepare({ bot, tokenInputs })
     */
    public async prepare({ bot, tokenInputs }: PrepareReconcileBalanceTransactionParams): Promise<PrepareReconcileBalanceTransactionResult> {
        const prepareTxs: Array<PrepareTx> = []
        for (const tokenInput of tokenInputs) {
            // skip swap if tokenIn and tokenOut are the same
            if (tokenInput.tokenIn.displayId === tokenInput.tokenOut.displayId) {
                continue
            }
            // get best quote from aggregator
            const { response, aggregatorId } = await this.solanaAggregatorSelectorService.batchQuote({
                tokenIn: tokenInput.tokenIn,
                tokenOut: tokenInput.tokenOut,
                amountIn: tokenInput.amount,
                senderAddress: bot.accountAddress,
            })
            const { payload: serializedTransaction } = await this.solanaAggregatorSelectorService.selectorSwap({
                aggregatorId,
                base: {
                    payload: response.payload,
                    tokenIn: tokenInput.tokenIn,
                    tokenOut: tokenInput.tokenOut,
                    accountAddress: bot.accountAddress,  
                },
            })
            // decode serialized transaction from aggregator
            const swapTransactionBytes = getBase64Encoder().encode(serializedTransaction as string)
            const swapTransaction = getTransactionDecoder().decode(swapTransactionBytes)
            const compiledSwapTransactionMessage = getCompiledTransactionMessageDecoder().decode(
                swapTransaction.messageBytes,
            )

            // decompile transaction message to get instructions
            const swapTransactionMessage = await this.rpcExecutorService.withSolanaRpc({
                accessType: RpcAccessType.Http,
                callback: async ({ rpc }) => {
                    return await decompileTransactionMessageFetchingLookupTables(
                        compiledSwapTransactionMessage,
                        rpc
                    )
                },
            })
            
            // extract swap instructions from transaction message
            const swapInstructions = swapTransactionMessage.instructions
            // create transaction message
            const { transactionMessage } = await this.solanaTxService.createTxMessage({
                bot,
                instructions: swapInstructions as Array<Instruction>,
            })
            prepareTxs.push(
                {
                    chainId: ChainId.Solana,
                    serializedTx: this.superJson.stringify(transactionMessage),
                }
            )
        }
        return {
            prepareTxs,
        }
    }

    /**
     * Signs a reconcile balance transaction.
     * 
     * @param param - Parameters for signing reconcile balance transaction
     * @returns Signed transaction
     * 
     * @example
     * const signedTx = await service.sign({ bot, prepareTx })
     */
    public async sign({ bot, prepareTx }: SignReconcileBalanceTransactionParams): 
    Promise<SignReconcileBalanceTransactionResult> {
        return {
            signedTx: await this.solanaTxService.signTx({
                bot,
                prepareTx,
                transactionType: TransactionType.ReconcileBalance,
            }),
        }
    }

    /**
     * Executes swap transactions for balance reconciliation.
     *
     * @param param - Parameters for executing reconcile balance transaction
     * @returns Array of transaction hashes
     *
     * @example
     * const txHashes = await service.execute({ bot, prepareTxs })
     */
    public async execute(
        { 
            bot, 
            signedTx, 
            txCheck = false, 
            stimulate = false 
        }: ExecuteReconcileBalanceTransactionParams): 
        Promise<ExecuteReconcileBalanceTransactionResult> {
        // check if transaction already exists on chain (for retries)
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
        // stage: simulation (optional)
        if (stimulate) {
            const { txHash } = await this.solanaStimulateService.stimulate({
                signedTx,
                bot,
                transactionType: TransactionType.ReconcileBalance,
            })
            return {
                txHash,
            }
        }
        // stage: execution
        const { txHash } = await this.solanaExecuteService.execute({
            signedTx,
            bot,
            transactionType: TransactionType.ReconcileBalance,
        })
        return {
            txHash,
        }
    }
}
