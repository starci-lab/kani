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
    PrepareTx,
} from "../../types"
import {
    PrivyPublicKeyNotFoundException,
    EncryptedPrivySignerPrivateKeyNotFoundException,
    MissingSuiMessageWithBytesParamException,
    TransactionType,
    TransactionValidationFailedException,
    TokenNotFoundException,
    TransactionNotFoundException,
    OutputCoinNotFoundException,
} from "@modules/exceptions"
import {
    AppVersion,
    TokenId,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    RpcAccessType,
} from "@modules/filesystem"
import {
    Transaction,
    TransactionDataBuilder,
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
    PrivySignService,
} from "@modules/privy"
import {
    WinstonLog,
    WinstonService,
} from "@modules/winston"
import {
    AsyncService,
} from "@modules/mixin"
import {
    SignatureWithBytes,
} from "@mysten/sui/cryptography"

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
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly suiAggregatorSelectorService: SuiAggregatorSelectorService,
        private readonly signerService: SignerService,
        private readonly privySignService: PrivySignService,
        private readonly winstonService: WinstonService,
        private readonly selectCoinsService: SelectCoinsService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly asyncService: AsyncService,
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
    public async prepare({ bot, tokenInputs, toAddress, toUsdc = false }: PrepareWithdrawTransactionParams): Promise<PrepareWithdrawTransactionResult> {
        return await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Write,
            callback: async ({ suiClient }) => {
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

                // build and sign transaction
                let txHash: string
                let signatureWithBytes: SignatureWithBytes | undefined

                if (bot.version === AppVersion.V1) {
                    // build transaction bytes
                    const bytes = await txb.build({
                        client: suiClient,
                    })
                    txHash = TransactionDataBuilder.getDigestFromBytes(bytes)
                    
                    // sign with V1 signer
                    signatureWithBytes = await this.signerService.withSuiSigner({
                        bot,
                        action: async (signer) => await signer.signTransaction(bytes),
                    })
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
                    const signed = await this.privySignService.signSuiTransaction({
                        publicKeyHex: bot.privyMetadata.walletPublicKey,
                        client: suiClient,
                        walletId: bot.privyMetadata.walletId,
                        transaction: txb,
                        encryptedPrivySignerPrivateKey: bot.encryptedPrivySignerPrivateKeyPayload,
                    })
                    txHash = signed.txHash
                    signatureWithBytes = signed.signatureWithBytes
                }

                const prepareTxs: Array<PrepareTx> = [
                    {
                        txHash,
                        signatureWithBytes,
                    },
                ]
                return {
                    prepareTxs,
                }
            },
        })
    }

    /**
     * Executes withdraw transactions.
     *
     * @param param - Parameters for executing withdraw transaction
     * @returns Array of transaction hashes
     *
     * @example
     * const txHashes = await service.execute({ bot, prepareTxs })
     */
    public async execute({ bot, prepareTxs, isRetry = false, stimulate = false }: ExecuteWithdrawTransactionParams): Promise<ExecuteWithdrawTransactionResult> {
        if (prepareTxs.length === 0) {
            return {
                txHashes: [],
            }
        }
        
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
                            }),
                        )
                        return transaction
                    },
                })
                
                // skip if transaction already exists and is successful
                if (transaction && transaction.effects?.status?.status === "success") {
                    this.winstonService.log(
                        WinstonLog.WithdrawTransactionFound,
                        {
                            botId: bot.id,
                            txHash: prepareTx.txHash,
                        },
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
                    type: TransactionType.Withdraw,
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
                                type: TransactionType.Withdraw,
                            })
                        }
                        this.winstonService.log(
                            WinstonLog.WithdrawTransactionStimulated,
                            {
                                botId: bot.id,
                                txHash: prepareTx.txHash,
                            },
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
                    await suiClient.waitForTransaction({
                        digest
                    })
                    this.winstonService.log(
                        WinstonLog.WithdrawTransactionExecuted,
                        {
                            botId: bot.id,
                            txHash: prepareTx.txHash,
                        },
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
