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
} from "../../interfaces"
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
    TokenType,
} from "@modules/typedefs"
import {
    AsyncService,
} from "@modules/mixin"
import {
    SignatureWithBytes,
} from "@mysten/sui/cryptography"

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

    public async prepare(
        {
            bot,
            tokenInputs,
            toAddress,
            toUsdc = false,
        }: PrepareWithdrawTransactionParams,
    ): Promise<PrepareWithdrawTransactionResult> {
        return await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Write,
            callback: async ({ suiClient }) => {
                let txb = new Transaction()
                txb.setSender(bot.accountAddress)

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
                        // Swap to USDC (if needed) then transfer USDC to receiver
                        if (tokenInput.token.displayId !== TokenId.SuiUsdc) {
                            const { sourceCoin } = await this.selectCoinsService.fetchAndMergeCoins({
                                txb,
                                owner: bot.accountAddress,
                                coinType: tokenInput.token.tokenAddress,
                                requiredAmount: tokenInput.amount,
                            })

                            const { aggregatorId, response } =
                await this.suiAggregatorSelectorService.batchQuote({
                    tokenIn: tokenInput.token,
                    tokenOut: usdcToken!,
                    amountIn: tokenInput.amount,
                    senderAddress: bot.accountAddress,
                })

                            const { outputCoin, txb: swapTxb } =
                await this.suiAggregatorSelectorService.selectorSwap({
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

                            if (!swapTxb) {
                                throw new TransactionNotFoundException(
                                    {
                                    },
                                )
                            }
                            txb = swapTxb

                            if (!outputCoin) {
                                throw new OutputCoinNotFoundException({
                                    botId: bot.id,
                                    type: ErrorTransactionType.Withdraw,
                                })
                            }
                            txb.transferObjects(
                                [outputCoin],
                                toAddress,
                            )
                        } else {
                            // USDC already: transfer directly
                            const { sourceCoin } = await this.selectCoinsService.fetchAndMergeCoins({
                                txb,
                                owner: bot.accountAddress,
                                coinType: tokenInput.token.tokenAddress,
                                requiredAmount: tokenInput.amount,
                            })  
                            txb.transferObjects(
                                [sourceCoin.coinArg],
                                toAddress,
                            )
                        }
                        continue
                    }
                    // else mean to target token
                    const targetToken = this.primaryMemoryStorageService.tokenCollection.findOne({
                        id: {
                            $eq: bot.targetToken.toString()
                        },
                    })
                    if (!targetToken) {
                        throw new TokenNotFoundException({
                            displayId: tokenInput.token.displayId,
                        }
                        )
                    }
                    if (tokenInput.token.displayId !== targetToken.displayId) {
                        const { sourceCoin } = await this.selectCoinsService.fetchAndMergeCoins({
                            txb,
                            owner: bot.accountAddress,
                            coinType: tokenInput.token.tokenAddress,
                            requiredAmount: tokenInput.amount,
                        })
                        const { aggregatorId, response } =
                        await this.suiAggregatorSelectorService.batchQuote({
                            tokenIn: tokenInput.token,
                            tokenOut: targetToken,
                            amountIn: tokenInput.amount,
                            senderAddress: bot.accountAddress,
                        })
                        const { outputCoin, txb: swapTxb } =
                        await this.suiAggregatorSelectorService.selectorSwap({
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
                        if (!outputCoin) {
                            throw new OutputCoinNotFoundException({
                                botId: bot.id,
                                type: ErrorTransactionType.Withdraw,
                            })
                        }
                        txb.transferObjects(
                            [outputCoin],
                            toAddress,
                        )
                        continue
                    }
                    // else mean transfer directly
                    const { sourceCoin } = await this.selectCoinsService.fetchAndMergeCoins({
                        txb,
                        owner: bot.accountAddress,
                        coinType: tokenInput.token.tokenAddress,
                        requiredAmount: tokenInput.amount,
                    })
                    txb.transferObjects(
                        [sourceCoin.coinArg],
                        toAddress,
                    )
                    continue
                }

                let txHash: string
                let signatureWithBytes: SignatureWithBytes | undefined

                if (bot.version === AppVersion.V1) {
                    const bytes = await txb.build({
                        client: suiClient,
                    })
                    txHash = TransactionDataBuilder.getDigestFromBytes(bytes)
                    signatureWithBytes = await this.signerService.withSuiSigner({
                        bot,
                        action: async (signer) => await signer.signTransaction(bytes),
                    })
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

    public async execute(
        {
            bot,
            prepareTxs,
            isRetry = false,
            stimulate = false,
        }: ExecuteWithdrawTransactionParams,
    ): Promise<ExecuteWithdrawTransactionResult> {
        if (prepareTxs.length === 0) {
            return {
                txHashes: [],
            }
        }
        const txHashes: Array<string> = []
        for (const prepareTx of prepareTxs) {
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

            const signatureWithBytes = prepareTx.signatureWithBytes
            if (!signatureWithBytes) {
                throw new MissingSuiMessageWithBytesParamException({
                    botId: bot.id,
                    type: ErrorTransactionType.Withdraw,
                })
            }

            await this.rpcExecutorService.withSuiClient({
                accessType: RpcAccessType.Write,
                callback: async ({ suiClient }) => {
                    if (stimulate) {
                        const transactionBlock = Transaction.from(signatureWithBytes.bytes)
                        const devInspect = await suiClient.devInspectTransactionBlock(
                            {
                                transactionBlock,
                                sender: bot.accountAddress,
                            },
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
                            },
                        )
                        txHashes.push(prepareTx.txHash)
                        return
                    }

                    const { digest } = await suiClient.executeTransactionBlock({
                        transactionBlock: signatureWithBytes.bytes,
                        signature: signatureWithBytes.signature,
                    })
                    await suiClient.waitForTransaction(
                        {
                            digest,
                        },
                    )
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
