import { Injectable, Logger } from "@nestjs/common"
import { IActionService, OpenPositionParams, OpenPositionResponse } from "../../interfaces"
import { InjectRaydiumClmmSdk } from "./raydium.decorators"
import { Raydium } from "@raydium-io/raydium-sdk-v2"
import { Connection } from "mongoose"
import { InjectPrimaryMongoose } from "@modules/databases"
import { SignerService } from "../../signers"
import { SolanaAggregatorSelectorService } from "../../aggregators"
import { PrimaryMemoryStorageService } from "@modules/databases"
import { 
    InvalidPoolTokensException, 
    TokenNotFoundException, 
    ZapAmountNotAcceptableException
} from "@exceptions"
import { SolanaTokenManagerService } from "../../utils"
import { TickMathService, ZapMathService, PoolMathService, EnsureMathService } from "../../math"
import { ChainId, Network, TokenType } from "@typedefs"
import { RAYDIUM_CLIENTS_INDEX } from "./constants"
import { OraclePriceService } from "../../pyth"
import { InjectSolanaClients, OPEN_POSITION_SLIPPAGE } from "@modules/blockchains"
import Decimal from "decimal.js"
import { EncryptionService } from "@modules/crypto"
import { HttpAndWsClients } from "../../clients"
import { Connection as SolanaConnection } from "@solana/web3.js"
import { 
    getBase64Encoder, 
    getTransactionDecoder,
    getCompiledTransactionMessageDecoder,
    decompileTransactionMessageFetchingLookupTables,
    createSolanaRpc,
} from "@solana/kit"

@Injectable()
export class RaydiumActionService implements IActionService {
    private readonly logger = new Logger(RaydiumActionService.name)
    constructor(
        @InjectRaydiumClmmSdk()
        private readonly raydiumClmmSdk: Raydium,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectSolanaClients()
        private readonly solanaClients: Record<Network, HttpAndWsClients<SolanaConnection>>,
        private readonly signerService: SignerService,
        private readonly solanaAggregatorSelectorService: SolanaAggregatorSelectorService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly solanaTokenManagerService: SolanaTokenManagerService,
        private readonly oraclePriceService: OraclePriceService,
        private readonly tickMathService: TickMathService,
        private readonly poolMathService: PoolMathService,
        private readonly zapMathService: ZapMathService,
        private readonly ensureMathService: EnsureMathService,
        private readonly encryptionService: EncryptionService,
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
        const client = this.solanaClients[network].http[RAYDIUM_CLIENTS_INDEX]
        const rpc = createSolanaRpc(client.rpcEndpoint)
        
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
        // retrieve the reasonable tick bounds
        const { 
            tickLower, 
            tickUpper 
        } = await this.tickMathService.getTickBounds(
            {
                tickCurrent: new Decimal(state.dynamic.tickCurrent),
                tickSpacing: new Decimal(state.static.tickSpacing),
                targetIsA,
                tickMultiplier: new Decimal(state.static.tickMultiplier),
            }
        )
        // compute the ratio of tokens used in the pool
        const { 
            ratio
        } = this.poolMathService.getRatioFromAmountA({
            slippage,
            sqrtPriceX64: state.dynamic.sqrtPriceX64,
            tickLower,
            tickUpper,
            tokenAId: tokenA.displayId,
            tokenBId: tokenB.displayId,
        })
        // compute the spot price of the pool
        const { 
            price: spotPrice
        } = this.tickMathService.sqrtPriceX64ToPrice({
            sqrtPriceX64: state.dynamic.sqrtPriceX64,
            decimalsA: tokenA.decimals,
            decimalsB: tokenB.decimals,
        })
        // compute the zap amounts
        const { 
            swapAmountIn, 
            remainingAmountIn, 
            receiveAmountOut 
        } = this.zapMathService.calculateZapAmounts({
            decimalsA: tokenA.decimals,
            decimalsB: tokenB.decimals,
            amountIn: remainingTargetTokenBalanceAmount,
            spotPrice,
            ratio,
            targetIsA,
            oraclePrice,
        })
        // quote the swap amount via aggregator
        const { 
            aggregatorId, 
            response 
        } = await this.solanaAggregatorSelectorService.batchQuote({
            tokenIn: tokenIn.displayId,
            tokenOut: tokenOut.displayId,
            amountIn: swapAmountIn,
            senderAddress: bot.accountAddress,
        })
        const ensureZapAmountsResponse = this.ensureMathService.ensureAmounts({
            actual: receiveAmountOut,
            expected: response.amountOut,
        })
        if (!ensureZapAmountsResponse.isAcceptable) {
            throw new ZapAmountNotAcceptableException(
                ensureZapAmountsResponse.deviation, 
                "Zap amount is not acceptable"
            )
        }
        const { 
            payload: serializedTransaction
        } = await this.solanaAggregatorSelectorService.selectorSwap({
            base: {
                payload: response.payload,
                tokenIn: tokenIn.displayId,
                tokenOut: tokenOut.displayId,
                accountAddress: bot.accountAddress,
            },
            aggregatorId
        })
        const swapTransactionBytes = getBase64Encoder().encode(serializedTransaction as string)
        const swapTransaction = getTransactionDecoder().decode(swapTransactionBytes)
        const compiledSwapTransactionMessage = getCompiledTransactionMessageDecoder().decode(
            swapTransaction.messageBytes,
        )
        const swapTransactionMessage = await decompileTransactionMessageFetchingLookupTables(
            compiledSwapTransactionMessage,
            rpc
        )
        const swapInstructions = swapTransactionMessage.instructions
        console.log(swapInstructions)
        // const { 
        //     poolInfo, 
        //     poolKeys
        // } = await this.raydiumClmmSdk.clmm.getPoolInfoFromRpc(state.static.poolAddress)
        // const epochInfo = await this.raydiumClmmSdk.fetchEpochInfo()
        // const res = await PoolUtils.getLiquidityAmountOutFromAmountIn({
        //     poolInfo,
        //     slippage: slippage.toNumber(),
        //     inputA: targetIsA,
        //     tickUpper: tickUpper.toNumber(),
        //     tickLower: tickLower.toNumber(),
        //     amount: remainingAmountIn,
        //     add: true,
        //     amountHasFee: true,
        //     epochInfo,
        // })
        // // set key pair to the sdk
        // this.raydiumClmmSdk.setOwner(
        //     new PublicKey(bot.accountAddress)
        // )
        // // open the position
        // const { 
        //     transaction: openPositionLegacyTransaction
        // } = await this.raydiumClmmSdk.clmm.openPositionFromLiquidity(
        //     {
        //         poolInfo,
        //         poolKeys,
        //         tickUpper: tickLower.toNumber(),
        //         tickLower: tickUpper.toNumber(),
        //         amountMaxA: remainingAmountIn,
        //         amountMaxB: receiveAmountOut,
        //         liquidity: res.liquidity,
        //         ownerInfo: {
        //             useSOLBalance: true,
        //         },
        //         txVersion: TxVersion.LEGACY,
        //         nft2022: true,
        //         computeBudgetConfig: {
        //             units: 600000,
        //             microLamports: 10000,
        //         },
        //     }
        // )
        // console.log(openPositionLegacyTransaction)
        // const openPositionTransactionBytes = openPositionLegacyTransaction.serialize()
        // const openPositionTransaction = getTransactionDecoder().decode(openPositionTransactionBytes)
        // const compiledOpenPositionTransactionMessage = getCompiledTransactionMessageDecoder().decode(
        //     openPositionTransaction.messageBytes,
        // )
        // const openPositionTransactionMessage = await decompileTransactionMessageFetchingLookupTables(
        //     compiledOpenPositionTransactionMessage,
        //     rpc
        // )
        // const openPositionInstructions = openPositionTransactionMessage.instructions
        // console.log(openPositionInstructions)
    }
}


