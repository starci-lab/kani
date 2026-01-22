import {
    Injectable 
} from "@nestjs/common"
import { 
    FetchBalanceParams, 
    FetchBalanceResult, 
    IBalanceService, 
    PrepareSwapTransactionParams,
    PrepareSwapTransactionResult,
    ExecuteSwapTransactionParams,
} from "./balance.interface"
import {
    AppVersion, 
} from "@modules/databases"
import {
    TransactionNotFoundException, 
    PrivyPublicKeyNotFoundException, 
    ErrorTransactionType,
    MissingSuiMessageWithBytesParamException,
    EncryptedPrivySignerPrivateKeyNotFoundException
} from "@modules/exceptions"
import BN from "bn.js"
import {
    SuiAggregatorSelectorService 
} from "../aggregators"
import {
    SignerService 
} from "../signers"
import {
    RpcExecutorService 
} from "@modules/blockchains"
import {
    RpcAccessType 
} from "@modules/filesystem"
import {
    TransactionDataBuilder 
} from "@mysten/sui/transactions"
import {
    PrivySignService 
} from "@modules/privy"
import {
    WinstonLog,
    WinstonService,
} from "@modules/winston"

@Injectable()
export class SuiBalanceService implements IBalanceService {
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly suiAggregatorSelectorService: SuiAggregatorSelectorService,
        private readonly signerService: SignerService,
        private readonly privySignService: PrivySignService,
        private readonly winstonService: WinstonService,
    ) {}

    async prepareSwapTransaction(
        {
            bot,
            tokenIn,
            tokenOut,
            amountIn,
        }: PrepareSwapTransactionParams
    ): Promise<PrepareSwapTransactionResult> {
        const { 
            aggregatorId, 
            response
        } = await this.suiAggregatorSelectorService.batchQuote({
            tokenIn,
            tokenOut,
            amountIn: amountIn,
            senderAddress: bot.accountAddress,
        })
        const { outputCoin, txb } = await this.suiAggregatorSelectorService.selectorSwap({
            base: {
                payload: response.payload,
                tokenIn,
                tokenOut,
                accountAddress: bot.accountAddress,
            },
            aggregatorId,
        })
        if (!txb) {
            throw new TransactionNotFoundException({
            })
        }
        // transfer the output coin to the bot's account address
        if (outputCoin) {
            txb.transferObjects([outputCoin],
                bot.accountAddress)
        }
        const result = await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
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
                        tokenIn,
                        tokenOut,
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
                    }
                    )
                }
            },
        })
        return {
            ...result,
            tokenIn,
            tokenOut,
        }
    }

    async executeSwapTransaction(
        {
            bot,
            txHash,
            signatureWithBytes,
            tokenIn,
            tokenOut,
        }: ExecuteSwapTransactionParams
    ): Promise<void> {
        const transaction = await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                return await suiClient.getTransactionBlock({
                    digest: txHash,
                })
            },
        })
        if (transaction) {
            return
        }
        if (!signatureWithBytes) {
            throw new MissingSuiMessageWithBytesParamException({
                botId: bot.id,
                type: ErrorTransactionType.Swap,
            })
        }
        await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Write,
            callback: async ({ suiClient }) => {
                
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
                    WinstonLog.SwapTransactionExecuted,
                    {
                        botId: bot.id,
                        txHash,
                        tokenIn: tokenIn.displayId,
                        tokenOut: tokenOut.displayId,
                    }
                )
            },
        })
    }

    async fetchBalance(
        {
            bot,
            token,
        }: FetchBalanceParams
    ): Promise<FetchBalanceResult> {
        return await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                const { totalBalance } = await suiClient.getBalance({
                    owner: bot.accountAddress,
                    coinType: token.tokenAddress,
                })
                return {
                    balanceAmount: new BN(totalBalance.toString()),
                }
            },
        })
    }   
}   