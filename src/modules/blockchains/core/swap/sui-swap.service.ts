import { Injectable } from "@nestjs/common"
import { InjectCetusAggregatorSdks, InjectSevenKAggregatorSdks } from "./swap.decorators"
import { AggregatorClient, RouterDataV3 } from "@cetusprotocol/aggregator-sdk"
import SevenK from "@7kprotocol/sdk-ts"
import { Network } from "@modules/common"
import { ISwapService, QuoteParams, QuoteResponse, SuiRouterId, SwapParams } from "./swap.interface"
import BN from "bn.js"
import { QuoteResponse as SevenKQuoteResponse } from "@7kprotocol/sdk-ts"
import { SuiCoinManagerService } from "../utils"
import { InjectWinston } from "@modules/winston"
import { Logger } from "winston"
import { InjectSuiClients } from "../clients"
import { SuiClient } from "@mysten/sui/client"
import { ActionResponse } from "../types"

@Injectable()
export class SuiSwapService implements ISwapService {
    constructor(
        @InjectCetusAggregatorSdks()
        private readonly cetusAggregatorSdks: Record<Network, AggregatorClient>,
        @InjectSevenKAggregatorSdks()
        private readonly sevenKAggregatorSdks: Record<Network, typeof SevenK>,
        private readonly suiCoinManagerService: SuiCoinManagerService,
        @InjectWinston()
        private readonly winstonLogger: Logger,
        @InjectSuiClients()
        private readonly suiClients: Record<Network, Array<SuiClient>>,
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
                    quoteData: data,
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
                        quoteData: data,
                    }
                }
            ),
        ])
        const bestQuote = [cetusAmountOut, sevenKAmountOut].reduce((prev, curr) =>
            curr.amountOut.gt(prev.amountOut) ? curr : prev,
        )
        //const bestQuote = sevenKAmountOut
        return bestQuote
    }

    async swap({
        routerId = SuiRouterId.Cetus,
        network = Network.Mainnet,
        tokenIn,
        tokenOut,
        tokens,
        amountIn,
        quoteData,
        fromAddress,
        recipientAddress = fromAddress,
        slippage = 0.01,
        txb
    }: SwapParams): Promise<ActionResponse> {
        const suiClient = this.suiClients[network][0]
        if (!txb) {
            throw new Error("Serialized data is required")
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
            suiClient,
            txb,
            owner: fromAddress,
            coinType: tokenInInstance.tokenAddress,
            requiredAmount: amountIn,
        })
        switch (routerId) {
        case SuiRouterId.Cetus:
        {
            const aggregator = this.cetusAggregatorSdks[network]
            if (!mergedCoin) {
                this.winstonLogger.error("MergedCoinIsRequired")
                throw new Error("Merged coin is required")
            }
            const outputCoin = await aggregator.routerSwap({
                router: quoteData as RouterDataV3,
                slippage,
                txb,
                inputCoin: mergedCoin,
            })
            txb.transferObjects([outputCoin], recipientAddress)
            return {
                txb
            }
        }
        case SuiRouterId.SevenK:
        {
            const aggregator = this.sevenKAggregatorSdks[network]
            if (!quoteData) {
                throw new Error("Serialized data is required")
            }
            if (!recipientAddress) {
                throw new Error("Account address is required")
            }
            const { coinOut } = await aggregator.buildTx({
                quoteResponse: quoteData as SevenKQuoteResponse,
                accountAddress: fromAddress,
                slippage,
                commission: {
                    partner: fromAddress,
                    commissionBps: 0,
                },
                extendTx: {
                    tx: txb,
                    // explicit consume this coin object instead of loading all available coin objects from wallet
                    coinIn: mergedCoin || undefined,
                },
            })
            if (!coinOut) {
                throw new Error("Coin out is required")
            }
            txb.transferObjects([coinOut], recipientAddress) 
            return {
                txb
            }
        }
        }
    }
}   