import { Injectable, Logger } from "@nestjs/common"
import { IActionService, OpenPositionParams, OpenPositionResponse } from "../../interfaces"
import { InjectRaydiumClmmSdk } from "./raydium.decorators"
import { Raydium } from "@raydium-io/raydium-sdk-v2"
import { Connection } from "mongoose"
import { InjectPrimaryMongoose } from "@modules/databases"
import { SignerService } from "../../signers"
import { SolanaAggregatorSelectorService } from "../../aggregators"
import { PrimaryMemoryStorageService } from "@modules/databases"
import { InvalidPoolTokensException, TokenNotFoundException } from "@exceptions"
import { PoolMathService, SolanaTokenManagerService, TickService } from "../../utils"
import { ChainId, Network, TokenType } from "@typedefs"
import { RAYDIUM_CLIENTS_INDEX } from "./constants"
import { OraclePriceService } from "../../pyth"
import { OPEN_POSITION_SLIPPAGE } from "@modules/blockchains"

@Injectable()
export class RaydiumActionService implements IActionService {
    private readonly logger = new Logger(RaydiumActionService.name)
    constructor(
        @InjectRaydiumClmmSdk()
        private readonly raydiumClmmSdk: Raydium,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly signerService: SignerService,
        private readonly solanaAggregatorSelectorService: SolanaAggregatorSelectorService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly solanaTokenManagerService: SolanaTokenManagerService,
        private readonly oraclePriceService: OraclePriceService,
        private readonly tickService: TickService,
        private readonly poolMathService: PoolMathService,
    ) { }

    async closePosition(): Promise<void> {
    }

    async openPosition(
        {
            targetIsA,
            state,
            network = Network.Mainnet,
            bot,
            slippage
        }: OpenPositionParams
    ): Promise<OpenPositionResponse> {
        slippage = slippage || OPEN_POSITION_SLIPPAGE
        // check if the tokens are in the pool
        const tokenA = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === state.static.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === state.static.tokenB.toString())
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
        const tokenIn = targetIsA ? tokenA : tokenB
        const tokenOut = targetIsA ? tokenB : tokenA
        const oraclePrice = await this
            .oraclePriceService
            .getOraclePrice({
                tokenA: tokenIn.displayId,
                tokenB: tokenOut.displayId,
            })
        const gasToken = this.primaryMemoryStorageService
            .tokens
            .find(token => 
                token.chainId === ChainId.Solana 
            && token.type === TokenType.Native
            && token.network === network
            )
        if (!gasToken) {
            throw new TokenNotFoundException("Gas token not found")
        }
        const { 
            status, 
            remainingTargetTokenBalanceAmount, 
            gasTokenBalanceAmount, 
            gasTokenSwapAmount
        } 
        = await this.solanaTokenManagerService
            .getAccountFunding({
                targetTokenId: tokenA.displayId,
                gasTokenId: gasToken.displayId,
                accountAddress: bot.accountAddress,
                network,
                clientIndex: RAYDIUM_CLIENTS_INDEX,
                oraclePrice,
            })
        const { 
            tickLower, 
            tickUpper 
        } = await this.tickService.getTickBounds(
            state,
            bot
        )
        const { ratio} = this.poolMathService.getRatioFromAmountA({
            slippage,
            sqrtPriceX64: state.dynamic.sqrtPriceX64,
            tickLower,
            tickUpper,
            tokenAId: tokenA.displayId,
            tokenBId: tokenB.displayId,
        })
        const spotPrice = this.tickService.sqrtPriceX64ToPrice(
            state.dynamic.sqrtPriceX64,
            tokenA.decimals,
            tokenB.decimals,
        )
        const { 
            swapAmountIn, 
            remainingAmountIn, 
            receiveAmountOut 
        } = this.poolMathService.calculateZapAmounts({
            decimalsA: tokenA.decimals,
            decimalsB: tokenB.decimals,
            amountIn: remainingTargetTokenBalanceAmount,
            spotPrice,
            ratio,
            targetIsA,
            oraclePrice,
        })
        console.log({ 
            swapAmountIn: swapAmountIn.toString(), 
            remainingAmountIn: remainingAmountIn.toString(), 
            receiveAmountOut: receiveAmountOut.toString(),
            priceLower: this.tickService.tickIndexToPrice(tickLower.toNumber(), tokenA.decimals, tokenB.decimals).toString(),
            priceUpper: this.tickService.tickIndexToPrice(tickUpper.toNumber(), tokenA.decimals, tokenB.decimals).toString(),
        })
        // const { aggregatorId, response } = await this.solanaAggregatorSelectorService.batchQuote({
        //     tokenIn: tokenIn.displayId,
        //     tokenOut: tokenOut.displayId,
        //     amountIn: remainingTargetTokenBalanceAmount,
        //     senderAddress: bot.accountAddress,
        // })
        // console.log({
        //     aggregatorId,
        //     response,
        // })

        
        // const tickLower = new Decimals(0)
        // const tickUpper = new Decimals(0)

        // const epochInfo = await this.raydiumClmmSdk.fetchEpochInfo()
        // const res = await PoolUtils.getLiquidityAmountOutFromAmountIn({
        //     poolInfo,
        //     slippage: 0,
        //     inputA: true,
        //     tickUpper: tickUpper.toNumber(),
        //     tickLower: tickLower.toNumber(),
        //     amount,
        //     add: true,
        //     amountHasFee: true,
        //     epochInfo,
        // })
        // const { transaction } = await this.raydiumClmmSdk.clmm.openPositionFromLiquidity(
        //     {
        //         poolInfo,
        //         poolKeys,
        //         tickLower: tickLower.toNumber(),
        //         tickUpper: tickUpper.toNumber(),
        //         amountMaxA: amount,
        //         amountMaxB: amount,
        //         liquidity: res.liquidity,
        //         ownerInfo: {
        //             useSOLBalance: true,
        //         },
        //         txVersion: TxVersion.V0,
        //         nft2022: true,
        //         computeBudgetConfig: {
        //             computeUnitLimit: 1000000,
        //             computeUnitPrice: 1000000,
        //         },
        //     }
        // )
    }
}


