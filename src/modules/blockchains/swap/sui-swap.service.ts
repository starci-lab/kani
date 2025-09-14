import { Injectable } from "@nestjs/common"
import { InjectCetusAggregatorSdks, InjectSevenKAggregatorSdks } from "./swap.decorators"
import { AggregatorClient, RouterDataV3 } from "@cetusprotocol/aggregator-sdk"
import SevenK from "@7kprotocol/sdk-ts"
import { Network } from "@modules/common"
import { ISwapService, QuoteParams, QuoteResponse, RouterId, SwapParams } from "./swap.interface"
import BN from "bn.js"
import { QuoteResponse as SevenKQuoteResponse } from "@7kprotocol/sdk-ts"
import { InjectWinston } from "@modules/winston"
import { Logger } from "winston"
import { ActionResponse } from "../dexes"
import { Transaction } from "@mysten/sui/transactions"

@Injectable()
export class SuiSwapService implements ISwapService {
    constructor(
        @InjectCetusAggregatorSdks()
        private readonly cetusAggregatorSdks: Record<Network, AggregatorClient>,
        @InjectSevenKAggregatorSdks()
        private readonly sevenKAggregatorSdks: Record<Network, typeof SevenK>,
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
                    routerId: RouterId.Cetus,
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
                        routerId: RouterId.SevenK,
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
        routerId = RouterId.Cetus,
        network = Network.Mainnet,
        tokenIn,
        tokenOut,
        tokens,
        inputCoinObj,
        quoteData,
        fromAddress,
        recipientAddress = fromAddress,
        slippage = 0.01,
        txb,
        transferCoinObjs,
    }: SwapParams): Promise<ActionResponse> {
        txb = txb || new Transaction()
        if (!inputCoinObj) {
            throw new Error("Input coin object is required")
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
        switch (routerId) {
        case RouterId.Cetus:
        {
            const aggregator = this.cetusAggregatorSdks[network]
            if (!inputCoinObj) {
                throw new Error("Merged coin is required")
            }
            const outputCoin = await aggregator.routerSwap({
                router: quoteData as RouterDataV3,
                slippage,
                txb,
                inputCoin: inputCoinObj,
            })
            if (transferCoinObjs) {
                txb.transferObjects([outputCoin], recipientAddress) 
            }
            return {
                txb,
                extraObj: {
                    coinOut: outputCoin
                }
            }
        }
        case RouterId.SevenK:
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
                    coinIn: inputCoinObj || undefined,
                },
            })
            if (!coinOut) {
                throw new Error("Coin out is required")
            }
            if (transferCoinObjs) {
                txb.transferObjects([coinOut], recipientAddress) 
            }
            return {
                txb,
                extraObj: {
                    coinOut
                }
            }
        }
        }
    }
}   