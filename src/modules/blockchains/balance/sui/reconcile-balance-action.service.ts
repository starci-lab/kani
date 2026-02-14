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
    TransactionType,
    TransactionNotFoundException,
    OutputCoinNotFoundException,
} from "@modules/exceptions"
import {
    Transaction,
} from "@mysten/sui/transactions"
import {
    SuiAggregatorSelectorService,
} from "../../aggregators"
import {
    SuiTxService,
    SuiFetchService,
    SuiStimulateService,
    SuiExecuteService,
} from "../../clients"
import {
    SelectCoinsService,
} from "../../tx-builder"
import {
    ChainId 
} from "@modules/common"
/**
 * Service for handling balance reconciliation on Sui.
 * Orchestrates swap transactions to reconcile balances between tokens.
 *
 * @example
 * const service = new SuiReconcileBalanceActionService(...)
 * const prepareTxs = await service.prepare({ bot, tokenInputs })
 * const txHashes = await service.execute({ bot, prepareTxs })
 */
@Injectable()
export class SuiReconcileBalanceActionService {
    constructor(
        private readonly suiAggregatorSelectorService: SuiAggregatorSelectorService,
        private readonly selectCoinsService: SelectCoinsService,
        private readonly suiTxService: SuiTxService,
        private readonly suiFetchService: SuiFetchService,
        private readonly suiStimulateService: SuiStimulateService,
        private readonly suiExecuteService: SuiExecuteService,
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
    public async prepare(
        { 
            bot, 
            tokenInputs 
        }: PrepareReconcileBalanceTransactionParams
    ): Promise<PrepareReconcileBalanceTransactionResult> {
        if (tokenInputs.length === 0) {
            return {
                prepareTxs: [],
            }
        }
        // initialize transaction block
        let txb = new Transaction()
        txb.setSender(bot.accountAddress)
        for (const tokenInput of tokenInputs) {
            // skip swap if tokenIn and tokenOut are the same
            if (tokenInput.tokenIn.displayId === tokenInput.tokenOut.displayId) {
                continue
            }
            // fetch and merge input coins
            const { sourceCoin } = await this.selectCoinsService.fetchAndMergeCoins({
                txb,
                owner: bot.accountAddress,
                coinType: tokenInput.tokenIn.tokenAddress,
                requiredAmount: tokenInput.amount,
            })
            
            // get best quote from aggregator
            const { aggregatorId, response } = await this.suiAggregatorSelectorService.batchQuote({
                tokenIn: tokenInput.tokenIn,
                tokenOut: tokenInput.tokenOut,
                amountIn: tokenInput.amount,
                senderAddress: bot.accountAddress,
            })
            
            // execute swap using selected aggregator
            const { outputCoin, txb: swapTxb } = await this.suiAggregatorSelectorService.selectorSwap({
                base: {
                    payload: response.payload,
                    tokenIn: tokenInput.tokenIn,
                    tokenOut: tokenInput.tokenOut,
                    accountAddress: bot.accountAddress,
                    txb,
                    inputCoin: sourceCoin.coinArg,
                },
                aggregatorId,
            })
            // validate swap transaction was created
            if (!swapTxb) {
                throw new TransactionNotFoundException({
                })
            }
            txb = swapTxb
            
            // validate output coin exists
            if (!outputCoin) {
                throw new OutputCoinNotFoundException({ 
                    botId: bot.id,
                    type: TransactionType.ReconcileBalance,
                })
            }
            
            // transfer output coin to bot's account
            txb.transferObjects([outputCoin],
                bot.accountAddress)
        }
        
        return {
            prepareTxs: [
                {
                    chainId: ChainId.Sui,
                    serializedTx: await txb.toJSON(),
                },
            ],
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
    public async sign(
        { 
            bot, 
            prepareTx 
        }: SignReconcileBalanceTransactionParams
    ): Promise<SignReconcileBalanceTransactionResult> {
        return {
            signedTx: await this.suiTxService.signTx({
                bot, prepareTx 
            })
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
        }: ExecuteReconcileBalanceTransactionParams): Promise<ExecuteReconcileBalanceTransactionResult> {
        // check if transaction already exists on chain (for retries)
        if (txCheck && !stimulate) {
            const txBlock = await this.suiFetchService.fetchTransactionBlock({
                txHash: signedTx.txHash,
            })
            if (txBlock) {
                return {
                    txHash: signedTx.txHash,
                }
            }
        }
        
      
        // execute or simulate transaction
        if (stimulate) {
            const { txHash } = await this.suiStimulateService.stimulate({
                signedTx,
                bot,
                transactionType: TransactionType.ReconcileBalance,
            })
            return {
                txHash,
            }
        } else {
            // execute transaction
            const { txHash } = await this.suiExecuteService.execute({
                signedTx,
                bot,
                transactionType: TransactionType.ReconcileBalance,
            })

            return {
                txHash,
            }
        }
    }
}
