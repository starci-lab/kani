import { Injectable } from "@nestjs/common"
import { InjectCetusAggregatorSdks, InjectSevenKAggregatorSdks } from "./swap.decorators"
import { AggregatorClient, RouterDataV3 } from "@cetusprotocol/aggregator-sdk"
import SevenK from "@7kprotocol/sdk-ts"
import { Network } from "@modules/common"
import { ISwapService, QuoteParams, QuoteResponse, SuiRouterId, SwapParams, SwapResponse } from "./swap.interface"
import BN from "bn.js"
import { InjectSuperJson } from "@modules/mixin"
import SuperJSON from "superjson"
import { QuoteResponse as SevenKQuoteResponse } from "@7kprotocol/sdk-ts"
import { Transaction } from "@mysten/sui/transactions"
import { SuiCoinManagerService } from "../utils"
import { InjectWinston } from "@modules/winston"
import { Logger } from "winston"

@Injectable()
export class SuiSwapService implements ISwapService {
    constructor(
        @InjectCetusAggregatorSdks()
        private readonly cetusAggregatorSdks: Record<Network, AggregatorClient>,
        @InjectSevenKAggregatorSdks()
        private readonly sevenKAggregatorSdks: Record<Network, typeof SevenK>,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        private readonly suiCoinManagerService: SuiCoinManagerService,
        @InjectWinston()
        private readonly winstonLogger: Logger,
    ) { }
    
    async quote({
        amountIn,
        tokenIn,
        tokenOut,
        tokens,
        network = Network.Mainnet,
    }: QuoteParams): Promise<QuoteResponse> {
        const tokenInInstance = tokens.find(
            token => token.displayId === tokenIn,
        )
        const tokenOutInstance = tokens.find(
            token => token.displayId === tokenOut,
        )
        if (!tokenInInstance || !tokenOutInstance) {
            throw new Error("Token not found")
        }
        const [ 
            cetusAmountOut, 
            sevenKAmountOut 
        ] = await Promise.all([
            this.cetusAggregatorSdks[network].findRouters(
                {
                    from: tokenInInstance.tokenAddress,
                    target: tokenOutInstance.tokenAddress,
                    amount: amountIn,
                    byAmountIn: true,
                }
            ).then(data => {
                return {
                    amountOut: data?.amountOut ?? new BN(0),
                    routerId: SuiRouterId.Cetus,
                    serializedData: this.superJson.stringify(data),
                }
            }),
            this.sevenKAggregatorSdks[network].getQuote(
                {
                    tokenIn: tokenInInstance.tokenAddress,
                    tokenOut: tokenOutInstance.tokenAddress,
                    amountIn: amountIn.toString(),
                }
            ).then(
                data => {
                    return {
                        amountOut: new BN(data.returnAmountWithDecimal),
                        routerId: SuiRouterId.SevenK,
                        serializedData: this.superJson.stringify(data),
                    }
                }
            ),
        ])
        const bestQuote = [cetusAmountOut, sevenKAmountOut].reduce((prev, curr) =>
            curr.amountOut.gt(prev.amountOut) ? curr : prev,
        )

        return bestQuote
    }

    async swap({
        routerId = SuiRouterId.Cetus,
        network = Network.Mainnet,
        tokenIn,
        tokenOut,
        tokens,
        amountIn,
        serializedData,
        fromAddress,
        recipientAddress = fromAddress,
        slippage = 0.05,
        serializedTx
    }: SwapParams): Promise<SwapResponse> {
        let txPayload = ""
        switch (routerId) {
        case SuiRouterId.Cetus:
        {
            const aggregator = this.cetusAggregatorSdks[network]
            if (!serializedData) {
                throw new Error("Serialized data is required")
            }
            const txb = Transaction.from(serializedTx)
            if (!txb) {
                throw new Error("Txb is required")
            }
            const tokenInInstance = tokens.find(
                token => token.displayId === tokenIn,
            )
            const tokenOutInstance = tokens.find(
                token => token.displayId === tokenOut,
            )
            if (!tokenInInstance || !tokenOutInstance) {
                throw new Error("Token not found")
            }
            const mergedCoin = await this.suiCoinManagerService.consolidateCoins({
                suiClient: aggregator.client,
                txb,
                owner: fromAddress,
                coinType: tokenInInstance.tokenAddress,
                requiredAmount: amountIn,
            })
            if (!mergedCoin) {
                this.winstonLogger.error("MergedCoinIsRequired")
                throw new Error("Merged coin is required")
            }
            const outputCoin = await this.cetusAggregatorSdks[network].routerSwap({
                router: this.superJson.parse<RouterDataV3>(serializedData),
                slippage,
                txb,
                inputCoin: mergedCoin,
            })
            txb.transferObjects([outputCoin], recipientAddress) 
            const txPayload = await txb.toJSON()
            return {
                txPayload
            }
        }
        case SuiRouterId.SevenK:
        {
            if (!serializedData) {
                throw new Error("Serialized data is required")
            }
            if (!recipientAddress) {
                throw new Error("Account address is required")
            }
            const tx = await this.sevenKAggregatorSdks[network].buildTx({
                quoteResponse: this.superJson.parse<SevenKQuoteResponse>(serializedData),
                accountAddress: fromAddress,
                slippage,
                commission: {
                    partner: "",
                    commissionBps: 0,
                }
            })
            txPayload = this.superJson.stringify(tx)
            break
        }
        }
        return {
            txPayload,
        }
    }
}   