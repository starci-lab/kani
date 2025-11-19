import { Injectable, Logger } from "@nestjs/common"
import { IActionService, OpenPositionParams, OpenPositionResponse } from "../../interfaces"
import { PoolUtils, Raydium, TickMath, TxVersion } from "@raydium-io/raydium-sdk-v2"
import { Connection } from "mongoose"
import { InjectPrimaryMongoose } from "@modules/databases"
import { SignerService } from "../../signers"
import { SolanaAggregatorSelectorService } from "../../aggregators"
import { PrimaryMemoryStorageService } from "@modules/databases"
import { 
    InvalidPoolTokensException, 
    TokenNotFoundException, 
    TransactionMessageTooLargeException, 
    ZapAmountNotAcceptableException
} from "@exceptions"
import { AccountFundingStatus, SolanaTokenManagerService } from "../../utils"
import { TickMathService, ZapMathService, PoolMathService, EnsureMathService } from "../../math"
import { ChainId, Network, TokenType } from "@typedefs"
import { RAYDIUM_CLIENTS_INDEX } from "./constants"
import { OraclePriceService } from "../../pyth"
import { InjectSolanaClients, OPEN_POSITION_SLIPPAGE } from "@modules/blockchains"
import Decimal from "decimal.js"
import { EncryptionService } from "@modules/crypto"
import { HttpAndWsClients } from "../../clients"
import { PublicKey, Connection as SolanaConnection } from "@solana/web3.js"
import { 
    getBase64Encoder, 
    getTransactionDecoder,
    getCompiledTransactionMessageDecoder,
    decompileTransactionMessageFetchingLookupTables,
    createSolanaRpc,
    pipe,
    createTransactionMessage,
    setTransactionMessageFeePayerSigner,
    setTransactionMessageLifetimeUsingBlockhash,
    appendTransactionMessageInstructions,
    createSignerFromKeyPair,
    createKeyPairFromBytes,
    addSignersToTransactionMessage,
    isTransactionMessageWithinSizeLimit,
    compileTransaction,
    signTransaction,
    getBase64EncodedWireTransaction,
} from "@solana/kit"
import {
    estimateComputeUnitLimitFactory,
} from "@solana-program/compute-budget"
import { InjectRaydiumClmmSdk } from "./raydium.decorators"

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
        private readonly tickMathService: TickMathService,
        private readonly poolMathService: PoolMathService,
        private readonly zapMathService: ZapMathService,
        private readonly ensureMathService: EnsureMathService,
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
        //const rpcSubscriptions = createSolanaRpcSubscriptions(client.rpcEndpoint)
        slippage = slippage || OPEN_POSITION_SLIPPAGE
        // check if the tokens are in the pool
        const tokenA = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === state.static.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === state.static.tokenB.toString())
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
        // get the tick bounds
        const { 
            tickLower, 
            tickUpper
        } = await this.tickMathService.getTickBounds({
            state,
            bot,
        })
        console.log({
            tickLower: tickLower.toNumber(),
            tickUpper: tickUpper.toNumber(),
            tickCurrent: state.dynamic.tickCurrent.toString(),
            tickCurrentSubTickLower: new Decimal(state.dynamic.tickCurrent).sub(tickLower).toString(),
            ticUpperSubTickCurrent: new Decimal(tickUpper).sub(state.dynamic.tickCurrent).toString(),
        })
        const { price: tickLowerPrice } = this.tickMathService.tickIndexToPrice({
            tickIndex: tickLower.toNumber(),
            decimalsA: tokenA.decimals,
            decimalsB: tokenB.decimals,
        })
        const { price: tickUpperPrice } = this.tickMathService.tickIndexToPrice({
            tickIndex: tickUpper.toNumber(),
            decimalsA: tokenA.decimals,
            decimalsB: tokenB.decimals,
        })
        console.log(tickLowerPrice.toFixed(), tickUpperPrice.toFixed())
        // compute the ratio of tokens used in the pool
        // const { 
        //     ratio
        // } = this.poolMathService.getRatioFromAmountA({
        //     slippage,
        //     sqrtPriceX64: state.dynamic.sqrtPriceX64,
        //     tickLower,
        //     tickUpper,
        //     tokenAId: tokenA.displayId,
        //     tokenBId: tokenB.displayId,
        // })
        // // compute the spot price of the pool
        // const { 
        //     price: spotPrice
        // } = this.tickMathService.sqrtPriceX64ToPrice({
        //     sqrtPriceX64: state.dynamic.sqrtPriceX64,
        //     decimalsA: tokenA.decimals,
        //     decimalsB: tokenB.decimals,
        // })
        // // compute the zap amounts
        // const { 
        //     swapAmountIn, 
        //     remainingAmountIn, 
        //     receiveAmountOut 
        // } = this.zapMathService.calculateZapAmounts({
        //     decimalsA: tokenA.decimals,
        //     decimalsB: tokenB.decimals,
        //     amountIn: remainingTargetTokenBalanceAmount,
        //     spotPrice,
        //     ratio,
        //     targetIsA,
        //     oraclePrice,
        // })
        // // quote the swap amount via aggregator
        // const { 
        //     aggregatorId, 
        //     response 
        // } = await this.solanaAggregatorSelectorService.batchQuote({
        //     tokenIn: tokenIn.displayId,
        //     tokenOut: tokenOut.displayId,
        //     amountIn: swapAmountIn,
        //     senderAddress: bot.accountAddress,
        // })
        // const ensureZapAmountsResponse = this.ensureMathService.ensureAmounts({
        //     actual: receiveAmountOut,
        //     expected: response.amountOut,
        // })
        // if (!ensureZapAmountsResponse.isAcceptable) {
        //     throw new ZapAmountNotAcceptableException(
        //         ensureZapAmountsResponse.deviation, 
        //         "Zap amount is not acceptable"
        //     )
        // }
        // const { 
        //     payload: serializedTransaction
        // } = await this.solanaAggregatorSelectorService.selectorSwap({
        //     base: {
        //         payload: response.payload,
        //         tokenIn: tokenIn.displayId,
        //         tokenOut: tokenOut.displayId,
        //         accountAddress: bot.accountAddress,
        //     },
        //     aggregatorId
        // })
        // const swapTransactionBytes = getBase64Encoder().encode(serializedTransaction as string)
        // const swapTransaction = getTransactionDecoder().decode(swapTransactionBytes)
        // const compiledSwapTransactionMessage = getCompiledTransactionMessageDecoder().decode(
        //     swapTransaction.messageBytes,
        // )
        // const swapTransactionMessage = await decompileTransactionMessageFetchingLookupTables(
        //     compiledSwapTransactionMessage,
        //     rpc
        // )
        // const swapInstructions = swapTransactionMessage.instructions

        // this.raydiumClmmSdk.setOwner(new PublicKey(bot.accountAddress))
        // await this.raydiumClmmSdk.account.fetchWalletTokenAccounts()
        // const { 
        //     poolInfo, 
        //     poolKeys,
        // } = await this.raydiumClmmSdk.clmm.getPoolInfoFromRpc(state.static.poolAddress)
        // const epochInfo = await this.raydiumClmmSdk.fetchEpochInfo()
        // const res = await PoolUtils.getLiquidityAmountOutFromAmountIn({
        //     poolInfo,
        //     slippage: slippage.toNumber(),
        //     inputA: true,
        //     tickUpper: tickUpper.toNumber(),
        //     tickLower: tickLower.toNumber(),
        //     amount: remainingAmountIn,
        //     add: true,
        //     amountHasFee: true,
        //     epochInfo,
        // })
        // // open the position
        // const { 
        //     transaction: openPositionLegacyTransaction
        // } = await this.raydiumClmmSdk.clmm.openPositionFromLiquidity(
        //     {
        //         poolInfo,
        //         poolKeys,
        //         tickUpper: tickLower.toNumber(),
        //         tickLower: tickUpper.toNumber(),
        //         amountMaxA: res.amountA.amount,
        //         amountMaxB: res.amountB.amount,
        //         liquidity: res.liquidity,
        //         ownerInfo: {
        //             useSOLBalance: true,
        //         },
        //         txVersion: TxVersion.V0,
        //         nft2022: true,
        //         feePayer: new PublicKey(bot.accountAddress),
        //         computeBudgetConfig: {
        //             units: 600000,
        //             microLamports: 10000,
        //         },
        //     }
        // )
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
        // const estimateComputeUnitLimit = estimateComputeUnitLimitFactory({ rpc })
        // const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
        // const txHash = await this.signerService.withSolanaSigner({
        //     bot,
        //     accountAddress: bot.accountAddress,
        //     network,
        //     action: async (signer) => {
        //         const keyPair = await createKeyPairFromBytes(signer.secretKey)
        //         const kitSigner = await createSignerFromKeyPair(keyPair)
        //         const transactionMessage = pipe(
        //             createTransactionMessage({ version: 0 }),
        //             (tx) => addSignersToTransactionMessage([kitSigner], tx),
        //             (tx) => setTransactionMessageFeePayerSigner(kitSigner, tx),
        //             (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        //             (tx) => appendTransactionMessageInstructions(swapInstructions, tx), 
        //         )
        //         if (!isTransactionMessageWithinSizeLimit(transactionMessage)) {
        //             throw new TransactionMessageTooLargeException("Transaction message is too large")
        //         }
        //         const transaction = compileTransaction(transactionMessage)
        //         // sign the transaction
        //         const signedTransaction = await signTransaction(
        //             [keyPair],
        //             transaction,
        //         )
        //         // send the transaction
        //         const txHash = await rpc.sendTransaction(
        //             getBase64EncodedWireTransaction(signedTransaction),
        //             { 
        //                 preflightCommitment: "confirmed", 
        //                 encoding: "base64"
        //             }).send()
        //         return txHash
        //     },
        // })
        // console.log(txHash)
        // const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })
        // const txHash = await sendAndConfirmTransaction(
        //     transaction, {
        //     commitment: "confirmed",
        // })
        // console.log(transactionMessage)
    }
}


