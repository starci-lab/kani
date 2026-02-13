import {
    Injectable,
} from "@nestjs/common"
import {
    PrepareWithdrawTransactionParams,
    PrepareWithdrawTransactionResult,
    ExecuteWithdrawTransactionParams,
    ExecuteWithdrawTransactionResult,
} from "../types"
import {
    TransactionType,
    TokenNotFoundException,
    TransactionNotFoundException,
    OutputCoinNotFoundException,
} from "@modules/exceptions"
import {
    TokenId,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    Transaction,
} from "@mysten/sui/transactions"
import {
    SuiAggregatorSelectorService,
} from "../../aggregators"
import {
    SuiFetchService,
    SuiStimulateService,
    SuiExecuteService,
} from "../../clients"
import {
    SelectCoinsService,
} from "../../tx-builder"
import {
    ChainId,
} from "@modules/common"

/**
 * Service for handling withdraw transactions on Sui.
 * Supports withdrawing tokens directly or converting to USDC before withdrawal.
 *
 * @example
 * const service = new SuiWithdrawActionService(...)
 * const prepareTxs = await service.prepare({ bot, tokenInputs, toAddress })
 * const txHashes = await service.execute({ bot, prepareTxs })
 */
@Injectable()
export class SuiWithdrawActionService {
    constructor(
        private readonly suiAggregatorSelectorService: SuiAggregatorSelectorService,
        private readonly selectCoinsService: SelectCoinsService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly suiFetchService: SuiFetchService,
        private readonly suiStimulateService: SuiStimulateService,
        private readonly suiExecuteService: SuiExecuteService,
    ) {
    }

    /**
     * Prepares withdraw transactions.
     * Optionally converts tokens to USDC before withdrawal.
     *
     * @param param - Parameters for preparing withdraw transaction
     * @returns Prepared transactions ready for execution
     *
     * @example
     * const prepareTxs = await service.prepare({ bot, tokenInputs, toAddress, toUsdc: true })
     */
    public async prepare(
        { 
            bot, 
            tokenInputs, 
            toAddress, 
            toUsdc = false 
        }: PrepareWithdrawTransactionParams): Promise<PrepareWithdrawTransactionResult> {
        // initialize transaction block
        let txb = new Transaction()
        txb.setSender(bot.accountAddress)

        // find USDC token if converting to USDC
        const usdcToken = toUsdc
            ? this.primaryMemoryStorageService.tokenCollection.findOne({
                displayId: {
                    $eq: TokenId.SuiUsdc,
                },
            })
            : null

        if (toUsdc && !usdcToken) {
            throw new TokenNotFoundException({
                displayId: TokenId.SuiUsdc,
            })
        }
        for (const tokenInput of tokenInputs) {
            if (toUsdc) {
                // swap to USDC if needed, then transfer
                if (tokenInput.token.displayId !== TokenId.SuiUsdc) {
                    // fetch and merge input coins
                    const { sourceCoin } = await this.selectCoinsService.fetchAndMergeCoins({
                        txb,
                        owner: bot.accountAddress,
                        coinType: tokenInput.token.tokenAddress,
                        requiredAmount: tokenInput.amount,
                    })

                    // get best quote from aggregator
                    const { aggregatorId, response } = await this.suiAggregatorSelectorService.batchQuote({
                        tokenIn: tokenInput.token,
                        tokenOut: usdcToken!,
                        amountIn: tokenInput.amount,
                        senderAddress: bot.accountAddress,
                    })

                    // execute swap using selected aggregator
                    const { outputCoin, txb: swapTxb } = await this.suiAggregatorSelectorService.selectorSwap({
                        base: {
                            payload: response.payload,
                            tokenIn: tokenInput.token,
                            tokenOut: usdcToken!,
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
                            type: TransactionType.Withdraw,
                        })
                    }
                    
                    // transfer USDC to recipient
                    txb.transferObjects(
                        [outputCoin],
                        toAddress
                    )
                } else {
                    // token is already USDC, transfer directly
                    const { sourceCoin } = await this.selectCoinsService.fetchAndMergeCoins({
                        txb,
                        owner: bot.accountAddress,
                        coinType: tokenInput.token.tokenAddress,
                        requiredAmount: tokenInput.amount,
                    })  
                    txb.transferObjects(
                        [sourceCoin.coinArg],
                        toAddress
                    )
                }
                continue
            }
            
            // find target token for conversion
            const targetToken = this.primaryMemoryStorageService.tokenCollection.findOne({
                id: {
                    $eq: bot.targetToken.toString()
                },
            })
            if (!targetToken) {
                throw new TokenNotFoundException({
                    displayId: tokenInput.token.displayId,
                })
            }
            
            // swap to target token if needed
            if (tokenInput.token.displayId !== targetToken.displayId) {
                // fetch and merge input coins
                const { sourceCoin } = await this.selectCoinsService.fetchAndMergeCoins({
                    txb,
                    owner: bot.accountAddress,
                    coinType: tokenInput.token.tokenAddress,
                    requiredAmount: tokenInput.amount,
                })
                
                // get best quote from aggregator
                const { aggregatorId, response } = await this.suiAggregatorSelectorService.batchQuote({
                    tokenIn: tokenInput.token,
                    tokenOut: targetToken,
                    amountIn: tokenInput.amount,
                    senderAddress: bot.accountAddress,
                })
                
                // execute swap using selected aggregator
                const { outputCoin, txb: swapTxb } = await this.suiAggregatorSelectorService.selectorSwap({
                    base: {
                        payload: response.payload,
                        tokenIn: tokenInput.token,
                        tokenOut: targetToken,
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
                        type: TransactionType.Withdraw,
                    })
                }
                
                // transfer target token to recipient
                txb.transferObjects(
                    [outputCoin],
                    toAddress
                )
                continue
            }
            
            // token matches target, transfer directly
            const { sourceCoin } = await this.selectCoinsService.fetchAndMergeCoins({
                txb,
                owner: bot.accountAddress,
                coinType: tokenInput.token.tokenAddress,
                requiredAmount: tokenInput.amount,
            })
            txb.transferObjects(
                [sourceCoin.coinArg],
                toAddress
            )
            continue
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
     * Executes withdraw transactions.
     *
     * @param param - Parameters for executing withdraw transaction
     * @returns Transaction hash
     *
     * @example
     * const txHash = await service.execute({ bot, signedTx })
     */
    public async execute(
        { 
            bot, 
            signedTx, 
            isRetry = false, 
            stimulate = false 
        }: ExecuteWithdrawTransactionParams): 
        Promise<ExecuteWithdrawTransactionResult> {
        // check if transaction already exists on chain (for retries)
        if (isRetry && !stimulate) {
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
                transactionType: TransactionType.Withdraw,
            })
            return {
                txHash,
            }
        }
        // execute transaction
        const { txHash } = await this.suiExecuteService.execute({
            signedTx,
            bot,
            transactionType: TransactionType.Withdraw,
        })
        return {
            txHash,
        }
    }
}
