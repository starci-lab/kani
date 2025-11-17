import { Injectable, Logger } from "@nestjs/common"
import { IActionService, OpenPositionParams, OpenPositionResponse } from "../../interfaces"
import { PoolUtils, TxVersion } from "@raydium-io/raydium-sdk-v2"
import { InjectRaydiumClmmSdk } from "./raydium.decorators"
import { Raydium } from "@raydium-io/raydium-sdk-v2"
import Decimals from "decimal.js"
import { Connection } from "mongoose"
import { InjectPrimaryMongoose } from "@modules/databases"
import { SignerService } from "../../signers"
import { SolanaAggregatorSelectorService } from "../../aggregators"
import { PrimaryMemoryStorageService } from "@modules/databases"
import { InvalidPoolTokensException } from "@exceptions"
import BN from "bn.js"
import { SolanaTokenManagerService } from "../../utils"
import { Network } from "@typedefs"
import { RAYDIUM_CLIENTS_INDEX } from "./constants"
import { OraclePriceService } from "../../pyth"

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
    ) { }

    async closePosition(): Promise<void> {
    }

    async openPosition(
        {
            state,
            network = Network.Mainnet,
            bot,
        }: OpenPositionParams
    ): Promise<OpenPositionResponse> {
        // check if the tokens are in the pool
        const tokenA = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === state.static.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === state.static.tokenB.toString())
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
        const oraclePrice = await this.oraclePriceService.getOraclePrice({
            tokenA: tokenA.displayId,
            tokenB: tokenB.displayId,
            network,
        })
        const { 
            status, 
            remainingTargetTokenBalanceAmount, 
            gasTokenBalanceAmount, 
            gasTokenSwapAmount
        } 
        = await this.solanaTokenManagerService
            .getAccountFunding({
                targetTokenId: tokenA.displayId,
                gasTokenId: tokenB.displayId,
                accountAddress: bot.accountAddress,
                network,
                clientIndex: RAYDIUM_CLIENTS_INDEX,
                oraclePrice,
            })
        console.log(
            status, 
            remainingTargetTokenBalanceAmount, 
            gasTokenBalanceAmount, 
            gasTokenSwapAmount
        )

        // const aggregator = await this.solanaAggregatorSelectorService.batchQuote({
        //     tokenIn: tokenA.displayId,
        //     tokenOut: tokenB.displayId,
        //     amountIn: new BN(amount),
        //     senderAddress: bot.accountAddress,
        // })
        // const { poolInfo, poolKeys } = await this.raydiumClmmSdk.clmm.getPoolInfoFromRpc(state.static.poolAddress)
        // if (!amount) {
        //     throw new Error("Amount is required")
        // }
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


