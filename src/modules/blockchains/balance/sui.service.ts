import { Injectable } from "@nestjs/common"
import { 
    FetchBalanceParams, 
    FetchBalanceResponse, 
    IBalanceService, 
    PrepareSwapTransactionParams,
    PrepareSwapTransactionResponse,
    ExecuteSwapTransactionParams,
} from "./balance.interface"
import { AppVersion, PrimaryMemoryStorageService } from "@modules/databases"
import { TokenNotFoundException, TransactionNotExecutedException, TransactionNotFoundException, PrivyPublicKeyNotFoundException } from "@exceptions"
import BN from "bn.js"
import { SuiAggregatorSelectorService } from "../aggregators"
import { EnsureMathService } from "../math"
import Decimal from "decimal.js"
import { SignerService } from "../signers"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as winstonLogger } from "winston"
import { RpcExecutorService } from "@modules/blockchains"
import { RpcAccessType } from "@modules/filesystem"
import { envConfig } from "@modules/env"
import { TransactionDataBuilder } from "@mysten/sui/transactions"
import { PrivySignService } from "@modules/privy"

@Injectable()
export class SuiBalanceService implements IBalanceService {
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly suiAggregatorSelectorService: SuiAggregatorSelectorService,
        private readonly ensureMathService: EnsureMathService,
        private readonly signerService: SignerService,
        private readonly privySignService: PrivySignService,
        @InjectWinston()
        private readonly logger: winstonLogger,
    ) {}

    async prepareSwapTransaction(
        {
            bot,
            tokenIn,
            tokenOut,
            amountIn,
            estimatedSwappedAmount,
        }: PrepareSwapTransactionParams
    ): Promise<PrepareSwapTransactionResponse> {
        const { 
            aggregatorId, 
            response
        } = await this.suiAggregatorSelectorService.batchQuote({
            tokenIn,
            tokenOut,
            amountIn: amountIn,
            senderAddress: bot.accountAddress,
        })
        this.ensureMathService.ensureActualNotAboveExpected({
            expected: estimatedSwappedAmount,
            actual: response.amountOut,
            lowerBound: new Decimal(envConfig().slippage.swap),
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
            throw new TransactionNotFoundException("Transaction not prepared")
        }
        // transfer the output coin to the bot's account address
        if (outputCoin) {
            txb.transferObjects([outputCoin], bot.accountAddress)
        }
        return await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Read,
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
                    }
                } else {
                    if (!bot.privyMetadata.publicKeyHex) {
                        throw new PrivyPublicKeyNotFoundException("Privy public key not found")
                    }
                    return await this.privySignService.signSuiTransaction({
                        publicKeyHex: bot.privyMetadata.publicKeyHex ?? "",
                        client: suiClient,
                        walletId: bot.privyMetadata.walletId,
                        transaction: txb,
                        encryptedPrivySignerPrivateKey: bot.encryptedPrivySignerPrivateKeyPayload,
                    })
                }
            },
        })
    }

    async executeSwapTransaction(
        {
            bot,
            txHash,
            signatureWithBytes,
            isRetry,
            tokenIn,
            tokenOut,
        }: ExecuteSwapTransactionParams
    ): Promise<void> {
        if (isRetry) {
            return await this.rpcExecutorService.withSuiClient({
                accessType: RpcAccessType.Read,
                callback: async ({ suiClient }) => {
                    const transaction = await suiClient.getTransactionBlock({
                        digest: txHash,
                    })
                    if (transaction) {
                        return
                    }
                    throw new TransactionNotExecutedException("Transaction not executed")
                },
            })
        }
        if (!signatureWithBytes) {
            throw new TransactionNotFoundException("Transaction not prepared")
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
                this.logger.verbose(
                    WinstonLog.SwapExecuted, {
                        botId: bot.id,
                        txHash,
                        tokenIn,
                        tokenOut,
                    }
                )
            },
        })
    }

    async fetchBalance(
        {
            bot,
            tokenId,
        }: FetchBalanceParams
    ): Promise<FetchBalanceResponse> {
        const token = this.primaryMemoryStorageService.tokens.find(
            (token) => token.displayId === tokenId.toString()
        )
        if (!token) {
            throw new TokenNotFoundException("Token not found")
        }
        return await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Read,
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