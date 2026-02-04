import {
    Injectable 
} from "@nestjs/common"
import {
    PrepareWithdrawTransactionParams,
    PrepareWithdrawTransactionResult,
    PrepareTx,
    ExecuteWithdrawTransactionParams,
    ExecuteWithdrawTransactionResult,
} from "../types"
import {
    PrivyPublicKeyNotFoundException,
    EncryptedPrivySignerPrivateKeyNotFoundException,
    MissingSuiMessageWithBytesParamException,
    ErrorTransactionType,
    TransactionValidationFailedException,
    TokenNotFoundException,
    TransactionNotFoundException,
    OutputCoinNotFoundException,
} from "@modules/exceptions"
import {
    AppVersion,
    TokenId,
    PrimaryMemoryStorageService
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
    TokenType 
} from "@modules/typedefs"
import BN from "bn.js"

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
    ) { }

    public async prepare(
        {
            bot,
            tokenInputs,
            toAddress,
            toUsdc = false,
        }: PrepareWithdrawTransactionParams
    ): Promise<PrepareWithdrawTransactionResult> {
        let txb = new Transaction()
        txb.setSender(bot.accountAddress)
        const prepareTxs: Array<PrepareTx> = []
        for (const tokenInput of tokenInputs) {
            const transaction = await this.rpcExecutorService.withSuiClient({
                accessType: RpcAccessType.Http,
                callback: async ({ suiClient }) => {
                    if (toUsdc) {
                        const usdcToken = this.primaryMemoryStorageService.tokenCollection.findOne({
                            displayId: {
                                $eq: TokenId.SuiUsdc,
                            }
                        }) 
                        if (!usdcToken) {
                            throw new TokenNotFoundException({
                                displayId: TokenId.SuiUsdc,
                            })
                        }
                        // if the token is not the same as the usdc token, we need to swap it to usdc
                        if (tokenInput.token.displayId !== TokenId.SuiUsdc) {
                            // get the input coin
                            const { sourceCoin } = await this.selectCoinsService.fetchAndMergeCoins({
                                txb,
                                owner: bot.accountAddress,
                                coinType: tokenInput.token.tokenAddress,
                                requiredAmount: tokenInput.amount,
                            })
                            const { 
                                aggregatorId, 
                                response
                            } = await this.suiAggregatorSelectorService.batchQuote({
                                tokenIn: tokenInput.token,
                                tokenOut: usdcToken,
                                amountIn: tokenInput.amount,
                                senderAddress: bot.accountAddress,
                            })
                            const { outputCoin, txb: swapTxb } = await this.suiAggregatorSelectorService.selectorSwap({
                                base: {
                                    payload: response.payload,
                                    tokenIn: tokenInput.token,
                                    tokenOut: usdcToken,
                                    accountAddress: bot.accountAddress,
                                    txb,
                                    inputCoin: sourceCoin.coinArg,
                                },
                                aggregatorId,
                            })
                            if (!swapTxb) {
                                throw new TransactionNotFoundException({
                                })
                            }
                            txb = swapTxb
                            // Transfer output coin to toAddress
                            if (!outputCoin) {
                                throw new OutputCoinNotFoundException(
                                    { 
                                        botId: bot.id,
                                        type: ErrorTransactionType.Withdraw,
                                    }
                                )
                            }
                            txb.transferObjects([outputCoin],
                                toAddress)
                            // Build and sign the transaction
                            if (bot.version === AppVersion.V1) {
                                const bytes = await txb.build({
                                    client: suiClient
                                })
                                const txHash = TransactionDataBuilder.getDigestFromBytes(bytes)
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
                                return await this.privySignService.signSuiTransaction({
                                    publicKeyHex: bot.privyMetadata.walletPublicKey,
                                    client: suiClient,
                                    walletId: bot.privyMetadata.walletId,
                                    transaction: txb,
                                    encryptedPrivySignerPrivateKey: bot.encryptedPrivySignerPrivateKeyPayload,
                                })
                            }
                        } else {
                            // If token is already USDC, transfer directly
                            const { sourceCoin } = await this.selectCoinsService.fetchAndMergeCoins({
                                txb,
                                owner: bot.accountAddress,
                                coinType: tokenInput.token.tokenAddress,
                                requiredAmount: tokenInput.amount,
                                suiGasAmount: new BN(0),
                            })
                            const { spendCoin } = this.selectCoinsService.splitCoin({
                                txb,
                                sourceCoin,
                                requiredAmount: tokenInput.amount,
                            })
                            txb.transferObjects([spendCoin.coinArg],
                                toAddress)
                            // Build and sign the transaction
                            if (bot.version === AppVersion.V1) {
                                const bytes = await txb.build({
                                    client: suiClient
                                })
                                const txHash = TransactionDataBuilder.getDigestFromBytes(bytes)
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
                                return await this.privySignService.signSuiTransaction({
                                    publicKeyHex: bot.privyMetadata.walletPublicKey,
                                    client: suiClient,
                                    walletId: bot.privyMetadata.walletId,
                                    transaction: txb,
                                    encryptedPrivySignerPrivateKey: bot.encryptedPrivySignerPrivateKeyPayload,
                                })
                            }
                        }
                    } else {
                        // mean to target token
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
                        // if the token is not the same as the target token, we need to swap it to the target token
                        if (tokenInput.token.displayId !== targetToken.displayId) {
                            // get the input coin
                            const { sourceCoin } = await this.selectCoinsService.fetchAndMergeCoins({
                                txb,
                                owner: bot.accountAddress,
                                coinType: tokenInput.token.tokenAddress,
                                requiredAmount: tokenInput.amount,
                            })
                            const { 
                                aggregatorId, 
                                response
                            } = await this.suiAggregatorSelectorService.batchQuote({
                                tokenIn: tokenInput.token,
                                tokenOut: targetToken,
                                amountIn: tokenInput.amount,
                                senderAddress: bot.accountAddress,
                            })
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
                            if (!swapTxb) {
                                throw new TransactionNotFoundException({
                                })
                            }
                            txb = swapTxb
                            // Transfer output coin to toAddress
                            if (!outputCoin) {
                                throw new OutputCoinNotFoundException(
                                    { 
                                        botId: bot.id,
                                        type: ErrorTransactionType.Withdraw,
                                    }
                                )
                            }
                            txb.transferObjects([outputCoin],
                                toAddress)
                        } else {
                            // If token is already target token, transfer directly
                            const transferToken = tokenInput.token
                            const transferAmount = tokenInput.amount
                            if (transferToken.type === TokenType.Native) {
                                const [coin] = txb.splitCoins(
                                    txb.gas,
                                    [txb.pure.u64(transferAmount.toString())]
                                )
                                txb.transferObjects([coin],
                                    toAddress)
                            } else {
                                const { sourceCoin } = await this.selectCoinsService.fetchAndMergeCoins({
                                    txb,
                                    owner: bot.accountAddress,
                                    coinType: transferToken.tokenAddress,
                                    requiredAmount: transferAmount,
                                    suiGasAmount: new BN(0),
                                })
                                const { spendCoin } = this.selectCoinsService.splitCoin({
                                    txb,
                                    sourceCoin,
                                    requiredAmount: transferAmount,
                                })
                                txb.transferObjects([spendCoin.coinArg],
                                    toAddress)
                            }
                        }
                    } 
                    if (bot.version === AppVersion.V1) {
                        const bytes = await txb.build({
                            client: suiClient,
                        })
                        const txHash = TransactionDataBuilder.getDigestFromBytes(bytes)
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
            prepareTxs.push({
                txHash: transaction.txHash,
                signatureWithBytes: transaction.signatureWithBytes,
            })
        }
        return {
            prepareTxs,
        }
    }

    public async execute(
        {
            bot,
            prepareTxs,
            isRetry = false,
            stimulate = false,
        }: ExecuteWithdrawTransactionParams
    ): Promise<ExecuteWithdrawTransactionResult> {
        const txHashes: Array<string> = []
        for (const prepareTx of prepareTxs) {
            // if isRetry, check if transaction has already been executed
            if (isRetry) {
                const transaction = await this.rpcExecutorService.withSuiClient({
                    accessType: RpcAccessType.Http,
                    callback: async ({ suiClient }) => {
                        return await suiClient.getTransactionBlock({
                            digest: prepareTx.txHash,
                            options: {
                                showEffects: true,
                            },
                        })
                    },
                })
                // if transaction already exists on chain and is successful, add to txHashes
                if (transaction && transaction.effects?.status?.status === "success") {
                    txHashes.push(prepareTx.txHash)
                    continue
                }
            }
            const signatureWithBytes = prepareTx.signatureWithBytes
            if (!signatureWithBytes) {
                throw new MissingSuiMessageWithBytesParamException({
                    botId: bot.id,
                    type: ErrorTransactionType.Withdraw,
                })
            }
            // execute the transaction
            await this.rpcExecutorService.withSuiClient({
                accessType: RpcAccessType.Write,
                callback: async ({ suiClient }) => {
                    if (stimulate) {
                        const transactionBlock = Transaction.from(signatureWithBytes.bytes)
                        const devInspect = await suiClient.devInspectTransactionBlock(
                            {
                                transactionBlock,
                                sender: bot.accountAddress,
                            }
                        )
                        if (devInspect.effects.status.status !== "success") {
                            throw new TransactionValidationFailedException({
                                botId: bot.id,
                                txHash: devInspect.effects.transactionDigest,
                                type: ErrorTransactionType.Withdraw,
                            })
                        }
                        this.winstonService.log(
                            WinstonLog.WithdrawTransactionStimulated,
                            {
                                botId: bot.id,
                                txHash: prepareTx.txHash,
                            }
                        )
                        return
                    }
                    const { digest } = await suiClient.executeTransactionBlock({
                        transactionBlock: signatureWithBytes.bytes,
                        signature: signatureWithBytes.signature,
                    })
                    await suiClient.waitForTransaction(
                        {
                            digest,
                        }
                    )
                    this.winstonService.log(
                        WinstonLog.WithdrawTransactionExecuted,
                        {
                            botId: bot.id,
                            txHash: prepareTx.txHash,
                        }
                    )
                },
            })
            txHashes.push(prepareTx.txHash)
        }
        return {
            txHashes,
        }
    }
}
