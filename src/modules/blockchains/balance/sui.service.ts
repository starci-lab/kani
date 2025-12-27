import { Injectable } from "@nestjs/common"
import { 
    FetchBalanceParams, 
    FetchBalanceResponse, 
    IBalanceService, 
    PrepareSwapTransactionParams,
    PrepareSwapTransactionResponse,
    ExecuteSwapTransactionParams,
} from "./balance.interface"
import { PrimaryMemoryStorageService } from "@modules/databases"
import { TokenNotFoundException, TransactionNotFoundException } from "@exceptions"
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
import { Transaction } from "@mysten/sui/transactions"

@Injectable()
export class SuiBalanceService implements IBalanceService {
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly suiAggregatorSelectorService: SuiAggregatorSelectorService,
        private readonly ensureMathService: EnsureMathService,
        private readonly signerService: SignerService,
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
            lowerBound: new Decimal(envConfig().bounds.sui.swap.lowerBound),
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
                const txHash = await txb.getDigest({ client: suiClient })
                return {
                    txHash,
                    txb,
                }
            },
        })
    }

    async executeSwapTransaction(
        {
            bot,
            txHash,
            txb,
            isRetry,
            tokenIn,
            tokenOut,
        }: ExecuteSwapTransactionParams
    ): Promise<void> {
        if (!txb) {
            throw new TransactionNotFoundException("Transaction not prepared")
        }
        await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Write,
            callback: async ({ suiClient }) => {
                if (isRetry) {
                    const transaction = await suiClient.getTransactionBlock({
                        digest: txHash,
                    })
                    if (transaction) {
                        return
                    }
                }
                await this.signerService.withSuiSigner({
                    bot,
                    action: async (signer) => {
                        const { digest } = await suiClient.signAndExecuteTransaction({
                            transaction: txb,
                            signer,
                        })
                        await suiClient.waitForTransaction({
                            digest,
                        })
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