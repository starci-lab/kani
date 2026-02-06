import {
    Injectable 
} from "@nestjs/common"
import {
    PrepareReconcileBalanceTransactionParams,
    PrepareReconcileBalanceTransactionResult,
    ExecuteReconcileBalanceTransactionParams,
    ExecuteReconcileBalanceTransactionResults,
} from "../types"
import {
    PrivyPublicKeyNotFoundException,
    EncryptedPrivySignerPrivateKeyNotFoundException,
    MissingSuiMessageWithBytesParamException,
    ErrorTransactionType,
    TransactionValidationFailedException,
    TransactionNotFoundException,
    OutputCoinNotFoundException,
} from "@modules/exceptions"
import {
    AppVersion
} from "@modules/databases"
import {
    RpcAccessType 
} from "@modules/filesystem"
import {
    Transaction,
    TransactionDataBuilder 
} from "@mysten/sui/transactions"
import {
    SuiAggregatorSelectorService,
} from "../../aggregators"
import {
    RpcExecutorService,
} from "../../clients"
import {
    SignerService,
} from "../../signers"
import {
    SelectCoinsService,
} from "../../tx-builder"
import {
    PrivySignService 
} from "@modules/privy"
import {
    WinstonLog,
    WinstonService 
} from "@modules/winston"
import {
    AsyncService
} from "@modules/mixin"

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
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly privySignService: PrivySignService,
        private readonly signerService: SignerService,
        private readonly winstonService: WinstonService,
        private readonly selectCoinsService: SelectCoinsService,
        private readonly asyncService: AsyncService,
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
                throw new TransactionNotFoundException({})
            }
            txb = swapTxb
            
            // validate output coin exists
            if (!outputCoin) {
                throw new OutputCoinNotFoundException({ 
                    botId: bot.id,
                    type: ErrorTransactionType.ReconcileBalance,
                })
            }
            
            // transfer output coin to bot's account
            txb.transferObjects([outputCoin], bot.accountAddress)
        }
        
        // build and sign transaction
        const transaction = await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                if (bot.version === AppVersion.V1) {
                    // build transaction bytes
                    const bytes = await txb.build({
                        client: suiClient,
                    })
                    const txHash = TransactionDataBuilder.getDigestFromBytes(bytes)
                    
                    // sign with V1 signer
                    const signatureWithBytes = await this.signerService.withSuiSigner({
                        bot,
                        action: async (signer) => {
                            return await signer.signTransaction(bytes)
                        },
                    })
                    return {
                        txHash,
                        signatureWithBytes,
                    }
                } else {
                    // validate privy metadata for V2 bots
                    if (!bot.privyMetadata?.walletPublicKey) {
                        throw new PrivyPublicKeyNotFoundException({
                            botId: bot.id,
                        })
                    }
                    if (!bot.encryptedPrivySignerPrivateKeyPayload) {
                        throw new EncryptedPrivySignerPrivateKeyNotFoundException({
                            botId: bot.id,
                        })
                    }
                    
                    // sign with Privy gas sponsor
                    return await this.privySignService.signSuiTransaction({
                        publicKeyHex: bot.privyMetadata.walletPublicKey,
                        client: suiClient,
                        walletId: bot.privyMetadata.walletId,
                        transaction: txb,
                        encryptedPrivySignerPrivateKey: bot.encryptedPrivySignerPrivateKeyPayload,
                    })
                }
            },
        })
        const prepareTxs = [
            {
                txHash: transaction.txHash,
                signatureWithBytes: transaction.signatureWithBytes,
            }
        ]
        return {
            prepareTxs,
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
    public async execute({ bot, prepareTxs, isRetry = false, stimulate = false }: ExecuteReconcileBalanceTransactionParams): Promise<ExecuteReconcileBalanceTransactionResults> {
        const txHashes: Array<string> = []
        for (const prepareTx of prepareTxs) {
            // check if transaction already exists on chain (for retries)
            if (isRetry && !stimulate) {
                const transaction = await this.rpcExecutorService.withSuiClient({
                    accessType: RpcAccessType.Http,
                    callback: async ({ suiClient }) => {
                        const [transaction] = await this.asyncService.resolveTuple( 
                            suiClient.getTransactionBlock({
                                digest: prepareTx.txHash,
                                options: {
                                    showEffects: true,
                                },
                            })
                        )
                        return transaction
                    },
                })
                
                // skip if transaction already exists and is successful
                if (transaction && transaction.effects?.status?.status === "success") {
                    this.winstonService.log(
                        WinstonLog.ReconcileBalanceTransactionFound,
                        {
                            botId: bot.id,
                            txHash: prepareTx.txHash,
                        }
                    )
                    txHashes.push(prepareTx.txHash)
                    continue
                }
            }
            
            // validate signature exists
            const { signatureWithBytes } = prepareTx
            if (!signatureWithBytes) {
                throw new MissingSuiMessageWithBytesParamException({
                    botId: bot.id,
                    type: ErrorTransactionType.ReconcileBalance,
                })
            }
            
            // execute or simulate transaction
            await this.rpcExecutorService.withSuiClient({
                accessType: RpcAccessType.Write,
                callback: async ({ suiClient }) => {
                    if (stimulate) {
                        // simulate transaction without sending
                        const transactionBlock = Transaction.from(signatureWithBytes.bytes)
                        const devInspect = await suiClient.devInspectTransactionBlock({
                            transactionBlock,
                            sender: bot.accountAddress,
                        })
                        if (devInspect.effects.status.status !== "success") {
                            throw new TransactionValidationFailedException({
                                botId: bot.id,
                                txHash: devInspect.effects.transactionDigest,
                                type: ErrorTransactionType.ReconcileBalance,
                            })
                        }
                        this.winstonService.log(
                            WinstonLog.ReconcileBalanceTransactionStimulated,
                            {
                                botId: bot.id,
                                txHash: prepareTx.txHash,
                            }
                        )
                        txHashes.push(prepareTx.txHash)
                        return
                    }
                    
                    // execute transaction and wait for confirmation
                    const { digest } = await suiClient.executeTransactionBlock({
                        transactionBlock: signatureWithBytes.bytes,
                        signature: signatureWithBytes.signature,
                        options: {
                            showEffects: true,
                        },
                    })
                    await suiClient.waitForTransaction({ digest })
                    this.winstonService.log(
                        WinstonLog.ReconcileBalanceTransactionExecuted,
                        {
                            botId: bot.id,
                            txHash: prepareTx.txHash,
                        }
                    )
                    txHashes.push(prepareTx.txHash)
                },
            })
        }
        return {
            txHashes,
        }
    }
}
