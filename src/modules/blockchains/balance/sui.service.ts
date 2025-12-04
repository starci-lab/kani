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
import { TokenNotFoundException } from "@exceptions"
import { SuiClient } from "@mysten/sui/client"
import BN from "bn.js"
import { SuiAggregatorSelectorService } from "../aggregators"
import { EnsureMathService } from "../math"
import Decimal from "decimal.js"
import { Transaction } from "@mysten/sui/transactions"
import { SignerService } from "../signers"

@Injectable()
export class SuiBalanceService implements IBalanceService {
    constructor(
        private readonly loadBalancerService: LoadBalancerService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly suiAggregatorSelectorService: SuiAggregatorSelectorService,
        private readonly ensureMathService: EnsureMathService,
        private readonly signerService: SignerService,
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
        const { payload: serializedTransaction } = await this.suiAggregatorSelectorService.selectorSwap({
            base: {
                payload: response.payload,
                tokenIn: tokenIn.displayId,
                tokenOut: tokenOut.displayId,
                accountAddress: bot.accountAddress,
            },
            aggregatorId: aggregatorId,
        })
        const url = this.loadBalancerService.balanceP2c(
            LoadBalancerName.SuiBalance,
            this.primaryMemoryStorageService.clientConfig.suiBalanceClientRpcs
        )
        const client = new SuiClient({
            url,
            network: "mainnet",
        })
        const { digest: txHash } = await this.signerService.withSuiSigner({
            bot,
            action: async (signer) => {
                return await client.signAndExecuteTransaction({
                    transaction: Transaction.from(serializedTransaction as string),
                    signer,
                })
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
            this.primaryMemoryStorageService.clientConfig.suiBalanceClientRpcs
        )
        const client = new SuiClient({
            url,
            network: "mainnet",
        })
        try {
            const { totalBalance } = await client.getBalance({
                owner: bot.accountAddress,
                coinType: token.tokenAddress,
            })
            console.log("totalBalance", totalBalance.toString())
            return {
                balanceAmount: new BN(totalBalance.toString()),
            }
        } catch (error) {
            console.log("error", error)
            return {
                balanceAmount: new BN(0),
            }
        }
    }   
}   