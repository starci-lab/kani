import { Injectable } from "@nestjs/common"
import { 
    FetchBalanceParams, 
    FetchBalanceResponse, 
    IBalanceService, 
    ProcessSwapTransactionParams, 
    ProcessSwapTransactionResponse
} from "./balance.interface"
import { LoadBalancerService } from "@modules/mixin"
import { LoadBalancerName, PrimaryMemoryStorageService } from "@modules/databases"
import { TokenNotFoundException, TransactionNotFoundException } from "@exceptions"
import { SuiClient } from "@mysten/sui/client"
import BN from "bn.js"
import { SuiAggregatorSelectorService } from "../aggregators"
import { EnsureMathService } from "../math"
import Decimal from "decimal.js"
import { SignerService } from "../signers"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as winstonLogger } from "winston"

@Injectable()
export class SuiBalanceService implements IBalanceService {
    constructor(
        private readonly loadBalancerService: LoadBalancerService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly suiAggregatorSelectorService: SuiAggregatorSelectorService,
        private readonly ensureMathService: EnsureMathService,
        private readonly signerService: SignerService,
        @InjectWinston()
        private readonly logger: winstonLogger,
    ) {}

    async processSwapTransaction(
        {
            bot,
            tokenIn,
            tokenOut,
            amountIn,
            estimatedSwappedAmount,
        }: ProcessSwapTransactionParams
    ): Promise<ProcessSwapTransactionResponse> {
        const { 
            aggregatorId, 
            response
        } = await this.suiAggregatorSelectorService.batchQuote({
            tokenIn: tokenIn.displayId,
            tokenOut: tokenOut.displayId,
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
                tokenIn: tokenIn.displayId,
                tokenOut: tokenOut.displayId,
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
        const url = this.loadBalancerService.balanceP2c(
            LoadBalancerName.SuiBalance,
            this.primaryMemoryStorageService.clientConfig.suiBalanceClientRpcs.write
        )
        const client = new SuiClient({
            url,
            network: "mainnet",
        })
        const txHash = await this.signerService.withSuiSigner<string>({
            bot,
            action: async (signer) => {
                const { digest } = await client.signAndExecuteTransaction({
                    transaction: txb,
                    signer,
                })
                await client.waitForTransaction({   
                    digest,
                })
                this.logger.debug(
                    WinstonLog.SwapTransactionSuccess, {
                        txHash: digest,
                        bot: bot.id,
                        tokenInId: tokenIn.displayId,
                        tokenOutId: tokenOut.displayId,
                    })
                return digest
            },
        })
        return {
            txHash,
        }
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
        const url = this.loadBalancerService.balanceP2c(
            LoadBalancerName.SuiBalance,
            this.primaryMemoryStorageService.clientConfig.suiBalanceClientRpcs.read
        )
        const client = new SuiClient({
            url,
            network: "mainnet",
        })
        const { totalBalance } = await client.getBalance({
            owner: bot.accountAddress,
            coinType: token.tokenAddress,
        })
        return {
            balanceAmount: new BN(totalBalance.toString()),
        }
    }   
}   