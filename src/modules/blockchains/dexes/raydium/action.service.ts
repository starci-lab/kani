import { Injectable } from "@nestjs/common"
import { ClosePositionParams, IActionService, OpenPositionParams } from "../../interfaces"
import { LiquidityMath,  SqrtPriceMath } from "@raydium-io/raydium-sdk-v2"
import { Connection } from "mongoose"
import {
    InjectPrimaryMongoose,
} from "@modules/databases"
import { SignerService } from "../../signers"
import { PrimaryMemoryStorageService } from "@modules/databases"
import { 
    ActivePositionNotFoundException,
    InvalidPoolTokensException, 
    SnapshotBalancesNotSetException,
    TransactionMessageTooLargeException,
} from "@exceptions"
import { TickMathService } from "../../math"
import { Network } from "@typedefs"
import { RAYDIUM_CLIENTS_INDEX } from "./constants"
import { InjectSolanaClients } from "@modules/blockchains"
import { HttpAndWsClients } from "../../clients"
import { Connection as SolanaConnection } from "@solana/web3.js"
import { 
    createSolanaRpc,
    createKeyPairFromBytes,
    signTransaction,
    pipe,
    addSignersToTransactionMessage,
    createSignerFromKeyPair,
    setTransactionMessageFeePayerSigner,
    setTransactionMessageLifetimeUsingBlockhash,
    isTransactionMessageWithinSizeLimit,
    compileTransaction,
    assertIsSendableTransaction,
    assertIsTransactionWithinSizeLimit,
    sendAndConfirmTransactionFactory,
    createSolanaRpcSubscriptions,
    getSignatureFromTransaction,
    createTransactionMessage,
    appendTransactionMessageInstructions,
} from "@solana/kit"
import BN from "bn.js"
import { Decimal } from "decimal.js"
import { BalanceService, CalculateProfitability, ProfitabilityMathService } from "../../balance"
import { BalanceSnapshotService, ClosePositionSnapshotService, OpenPositionSnapshotService } from "../../snapshots"
import { ClosePositionInstructionService, OpenPositionInstructionService } from "./transactions"
import { httpsToWss } from "@utils"

@Injectable()
export class RaydiumActionService implements IActionService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectSolanaClients()
        private readonly solanaClients: Record<Network, HttpAndWsClients<SolanaConnection>>,
        private readonly signerService: SignerService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly tickMathService: TickMathService,
        private readonly balanceService: BalanceService,
        private readonly balanceSnapshotService: BalanceSnapshotService,
        private readonly openPositionSnapshotService: OpenPositionSnapshotService,
        private readonly closePositionSnapshotService: ClosePositionSnapshotService,
        private readonly closePositionInstructionService: ClosePositionInstructionService,
        private readonly profitabilityMathService: ProfitabilityMathService,
        private readonly openPositionInstructionService: OpenPositionInstructionService,
    ) { }

    async closePosition(
        params: ClosePositionParams
    ): Promise<void> {
        const {
            bot,
        } = params
        if (!bot.activePosition) 
        {
            throw new ActivePositionNotFoundException(
                bot.id, 
                "Active position not found"
            )
        }
        // we have many close conditions
        // 1. the position is out-of-range, we close immediately
        // 2. our detection find a potential dump from CEX
        // 3. the position is not profitable, we close it  
        const shouldProceedAfterIsPositionOutOfRange = await this.assertIsPositionOutOfRange(params)
        if (!shouldProceedAfterIsPositionOutOfRange) {
            return
        }
    }

    private async assertIsPositionOutOfRange(
        {
            bot,
            state
        }: ClosePositionParams
    ): Promise<boolean> {
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException(
                bot.id, 
                "Active position not found"
            )
        }
        if (
            new Decimal(state.dynamic.tickCurrent).gte(bot.activePosition.tickLower) 
            && new Decimal(state.dynamic.tickCurrent).lte(bot.activePosition.tickUpper)
        ) {
            // do nothing, since the position is still in the range
            // return true to continue the assertion
            return true
        }
        const tokenA = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === state.static.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === state.static.tokenB.toString())
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
        const targetIsA = bot.targetToken.id === state.static.tokenA.toString()
        await this.proccessClosePositionTransaction({
            bot,
            state,
            tokenAId: tokenA.displayId,
            tokenBId: tokenB.displayId,
            targetIsA,
        })
        // return false to terminate the assertion
        return false
    }

    private async proccessClosePositionTransaction(
        {
            bot,
            state
        }: ClosePositionParams
    ): Promise<void> {
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException(
                bot.id, 
                "Active position not found"
            )
        }
        const network = Network.Mainnet
        const client = this.solanaClients[network].http[RAYDIUM_CLIENTS_INDEX]
        const rpc = createSolanaRpc(client.rpcEndpoint)
        const rpcSubscriptions = createSolanaRpcSubscriptions(httpsToWss(client.rpcEndpoint))
        // check if the tokens are in the pool
        const tokenA = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === state.static.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === state.static.tokenB.toString())
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
        const targetIsA = bot.targetToken.id === state.static.tokenA.toString()
        const targetToken = targetIsA ? tokenA : tokenB
        const quoteToken = targetIsA ? tokenB : tokenA
        const closePositionInstructions = await this.closePositionInstructionService.createCloseInstructions({
            bot,
            state,
            clientIndex: RAYDIUM_CLIENTS_INDEX,
        })
        // sign the transaction
        const txHash = await this.signerService.withSolanaSigner({
            bot,
            accountAddress: bot.accountAddress,
            network,
            action: async (signer) => {
                const keyPair = await createKeyPairFromBytes(signer.secretKey)
                const kitSigner = await createSignerFromKeyPair(keyPair)
                const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
                const transactionMessage = pipe(
                    createTransactionMessage({ version: 0 }),
                    (tx) => addSignersToTransactionMessage([kitSigner], tx),
                    (tx) => setTransactionMessageFeePayerSigner(kitSigner, tx),
                    (tx) => appendTransactionMessageInstructions(closePositionInstructions, tx),
                    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
                )
                if (!isTransactionMessageWithinSizeLimit(transactionMessage)) {
                    throw new TransactionMessageTooLargeException("Transaction message is too large")
                }
                const transaction = compileTransaction(transactionMessage)
                // sign the transaction
                const signedTransaction = await signTransaction(
                    [keyPair],
                    transaction,
                )
                assertIsSendableTransaction(signedTransaction)
                assertIsTransactionWithinSizeLimit(signedTransaction)
                const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
                    rpc,
                    rpcSubscriptions,
                })
                const transactionSignature = getSignatureFromTransaction(signedTransaction)
                await sendAndConfirmTransaction(
                    signedTransaction, {
                        commitment: "confirmed",
                    })
                return transactionSignature.toString()
            },
        })

        const {
            quoteBalanceAmount: adjustedQuoteBalanceAmount,
            targetBalanceAmount: adjustedTargetBalanceAmount,
            gasBalanceAmount: adjustedGasBalanceAmount,
        } = await this.balanceService.fetchBalances({
            bot,
        })
        const session = await this.connection.startSession()
        await session.withTransaction(
            async () => {
                if (!bot.activePosition) {
                    throw new ActivePositionNotFoundException(
                        bot.id, 
                        "Active position not found"
                    )
                }
                const before: CalculateProfitability = {
                    targetTokenBalanceAmount: new BN(bot.snapshotTargetBalanceAmount || 0),
                    quoteTokenBalanceAmount: new BN(bot.snapshotQuoteBalanceAmount || 0),
                    gasBalanceAmount:  bot.snapshotGasBalanceAmount ? new BN(bot.snapshotGasBalanceAmount) : new BN(0),
                }
                const after: CalculateProfitability = {
                    targetTokenBalanceAmount: new BN(adjustedTargetBalanceAmount),
                    quoteTokenBalanceAmount: new BN(adjustedQuoteBalanceAmount),
                    gasBalanceAmount: adjustedGasBalanceAmount ? new BN(adjustedGasBalanceAmount) : new BN(0),
                }
                const { roi, pnl } = await this.profitabilityMathService.calculateProfitability({
                    before,
                    after,
                    targetTokenId: targetToken.displayId,
                    quoteTokenId: quoteToken.displayId,
                    chainId: bot.chainId,
                    network,
                })
                if (pnl.gt(0)) {
                    // transfer 4% of the pnl to the bot
                    const pnlAmount = pnl.mul(0.04)
                    await this.balanceService.transferBalance({
                        bot,
                        targetTokenId: targetToken.displayId,
                        quoteTokenId: quoteToken.displayId,
                        amount: pnlAmount,
                    })
                }
                await this.balanceSnapshotService.updateBotSnapshotBalancesRecord({
                    bot,
                    targetBalanceAmount: adjustedTargetBalanceAmount,
                    quoteBalanceAmount: adjustedQuoteBalanceAmount,
                    gasAmount: adjustedGasBalanceAmount,
                    session,
                })
                await this.closePositionSnapshotService.updateClosePositionTransactionRecord({
                    bot,
                    pnl,
                    roi,
                    positionId: bot.activePosition.id,
                    closeTxHash: txHash,
                    targetAmountReturned: new BN(after.targetTokenBalanceAmount).sub(before.targetTokenBalanceAmount),
                    quoteAmountReturned: new BN(after.quoteTokenBalanceAmount).sub(before.quoteTokenBalanceAmount),
                    gasAmountReturned: before.gasBalanceAmount ? new BN(after.gasBalanceAmount).sub(before.gasBalanceAmount) : undefined,
                    feePaidAmount: bot.activePosition.feePaidAmount ? new BN(bot.activePosition.feePaidAmount) : undefined,
                    session,
                })
            })
    }

    async openPosition(
        {
            targetIsA,
            state,
            network = Network.Mainnet,
            bot,
        }: OpenPositionParams
    ) {
        const {
            snapshotTargetBalanceAmount,
            snapshotQuoteBalanceAmount,
            snapshotGasBalanceAmount,
        } = bot
        if (!snapshotTargetBalanceAmount || !snapshotQuoteBalanceAmount) {
            throw new SnapshotBalancesNotSetException("Snapshot balances not set")
        }
        const client = this.solanaClients[network].http[RAYDIUM_CLIENTS_INDEX]
        const rpc = createSolanaRpc(client.rpcEndpoint)
        const rpcSubscriptions = createSolanaRpcSubscriptions(httpsToWss(client.rpcEndpoint))
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
    
        const sqrtPriceCurrentX64 = SqrtPriceMath.getSqrtPriceX64FromTick(
            state.dynamic.tickCurrent,
        )
        const sqrtPriceLowerX64 = SqrtPriceMath.getSqrtPriceX64FromTick(
            tickLower.toNumber(),
        )
        const sqrtPriceUpperX64 = SqrtPriceMath.getSqrtPriceX64FromTick(
            tickUpper.toNumber(),
        )
        const amountA = targetIsA ? new BN(snapshotTargetBalanceAmount) : new BN(snapshotQuoteBalanceAmount)
        const amountB = targetIsA ? new BN(snapshotQuoteBalanceAmount) : new BN(snapshotTargetBalanceAmount)
        const liquidity = LiquidityMath.getLiquidityFromTokenAmounts(
            sqrtPriceCurrentX64,
            sqrtPriceLowerX64,
            sqrtPriceUpperX64,
            amountA,
            amountB,
        )
        // open the position
        const {
            instructions: openPositionInstructions,
            mintKeyPair,
            ataAddress,
        } = await this.openPositionInstructionService.createOpenPositionInstructions({
            bot,
            state,
            clientIndex: RAYDIUM_CLIENTS_INDEX,
            liquidity,
            amountAMax: amountA,
            amountBMax: amountB,
            tickLower,
            tickUpper,
        })
        // convert the transaction to a transaction with lifetime
        // sign the transaction
        const txHash = await this.signerService.withSolanaSigner({
            bot,
            accountAddress: bot.accountAddress,
            network,
            action: async (signer) => {
                const keyPair = await createKeyPairFromBytes(signer.secretKey)
                const kitSigner = await createSignerFromKeyPair(keyPair)
                const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
                const transactionMessage = pipe(
                    createTransactionMessage({ version: 0 }),
                    (tx) => addSignersToTransactionMessage([kitSigner, mintKeyPair], tx),
                    (tx) => setTransactionMessageFeePayerSigner(kitSigner, tx),
                    (tx) => appendTransactionMessageInstructions(openPositionInstructions, tx),
                    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
                )
                if (!isTransactionMessageWithinSizeLimit(transactionMessage)) {
                    throw new TransactionMessageTooLargeException("Transaction message is too large")
                }
                const transaction = compileTransaction(transactionMessage)
                // sign the transaction
                const signedTransaction = await signTransaction(
                    [keyPair, mintKeyPair.keyPair],
                    transaction,
                )
                assertIsSendableTransaction(signedTransaction)
                assertIsTransactionWithinSizeLimit(signedTransaction)
                const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
                    rpc,
                    rpcSubscriptions,
                })
                const transactionSignature = getSignatureFromTransaction(signedTransaction)
                await sendAndConfirmTransaction(
                    signedTransaction, {
                        commitment: "confirmed",
                    })
                return transactionSignature.toString()
            },
        })
        // we refetch the balances after the position is opened
        const {
            quoteBalanceAmount: adjustedQuoteBalanceAmount,
            targetBalanceAmount: adjustedTargetBalanceAmount,
            gasBalanceAmount: adjustedGasBalanceAmount,
        } = await this.balanceService.fetchBalances({
            bot,
        })
        const session = await this.connection.startSession()
        await session.withTransaction(
            async () => {
                await this.openPositionSnapshotService.addOpenPositionTransactionRecord({
                    targetAmountUsed: 
            new BN(snapshotTargetBalanceAmount)
                .sub(new BN(adjustedTargetBalanceAmount)),
                    quoteAmountUsed: 
            new BN(snapshotQuoteBalanceAmount)
                .sub(new BN(adjustedQuoteBalanceAmount)),
                    liquidity: new BN(liquidity),
                    gasAmountUsed: snapshotGasBalanceAmount ? 
                        new BN(snapshotGasBalanceAmount)
                            .sub(adjustedGasBalanceAmount ? 
                                new BN(adjustedGasBalanceAmount   
                                ) : new BN(0))
                        : undefined,
                    bot,
                    targetIsA,
                    tickLower: tickLower.toNumber(),
                    tickUpper: tickUpper.toNumber(),
                    network,
                    chainId: bot.chainId,
                    liquidityPoolId: state.static.displayId,
                    positionId: ataAddress.toString(),
                    openTxHash: txHash,
                    session,
                })
                await this.balanceSnapshotService.updateBotSnapshotBalancesRecord({
                    bot,
                    targetBalanceAmount: adjustedTargetBalanceAmount,
                    quoteBalanceAmount: adjustedQuoteBalanceAmount,
                    gasAmount: adjustedGasBalanceAmount,
                    session,
                })
            })
    }
}

