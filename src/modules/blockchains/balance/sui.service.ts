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
import { InjectWinston } from "@modules/winston"
import { Logger as winstonLogger } from "winston"
import { RpcExecutorService } from "@modules/blockchains"
import { RpcAccessType } from "@modules/filesystem"

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
            lowerBound: new Decimal(0.95),
        })
        const { outputCoin, txb } = await this.suiAggregatorSelectorService.selectorSwap({
            base: {
                payload: response.payload,
                tokenIn,
                tokenOut,
                accountAddress: bot.accountAddress,
            },
            aggregatorId: aggregatorId,
        })
        if (!txb) {
            throw new TransactionNotFoundException("Transaction is required")
        }
        // transfer the output coin to the bot's account address
        if (outputCoin) {
            txb.transferObjects([outputCoin], bot.accountAddress)
        }
        // Calculate txHash from transaction bytes
        const txHash = await txb.getDigest()
        return {
            txHash,
            txb,
        }
    }

    async executeSwapTransaction(
        {
            bot,
            txHash,
            txb,
            isRetry,
        }: ExecuteSwapTransactionParams
    ): Promise<void> {
        if (!txb) {
            throw new TransactionNotFoundException("Transaction not prepared")
        }
        await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Write,
            callback: async ({ suiClient }) => {
                if (isRetry) {
                    const transactionExisted = await suiClient.getTransactionBlock({
                        digest: txHash,
                    })
                    if (transactionExisted) {
                        return
                    }
                }
                await this.signerService.withSuiSigner({
                    bot,
                    action: async (signer) => {
                        await suiClient.signAndExecuteTransaction({
                            transaction: txb,
                            signer,
                        })
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