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
import { GasStatus, GasStatusService } from "../../balance"
import { SolanaBalanceService } from "@modules/blockchains/balance/solana.service"

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
        private readonly gasStatusService: GasStatusService,
        private readonly solanaBalanceService: SolanaBalanceService,
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
        const before: CalculateProfitability = {
            targetTokenBalanceAmount: new BN(bot.snapshotTargetBalanceAmount || 0),
            quoteTokenBalanceAmount: new BN(bot.snapshotQuoteBalanceAmount || 0),
            gasBalanceAmount:  new BN(bot.snapshotGasBalanceAmount || 0),
        }
        const after: CalculateProfitability = {
            targetTokenBalanceAmount: new BN(adjustedTargetBalanceAmount),
            quoteTokenBalanceAmount: new BN(adjustedQuoteBalanceAmount),
            gasBalanceAmount: new BN(adjustedGasBalanceAmount || 0),
        }
        const { 
            roi, 
            pnl 
        } = await this.profitabilityMathService.calculateProfitability({
            before,
            after,
            targetTokenId: targetToken.displayId,
            quoteTokenId: quoteToken.displayId,
            chainId: bot.chainId,
            network,
        })
        const {
            targetFeeAmount,
            quoteFeeAmount,
            txHash: feesTxHash,
        } = await this.solanaBalanceService.processTransferFeesTransaction({
            bot,
            roi,
            targetBalanceAmount: adjustedTargetBalanceAmount,
            quoteBalanceAmount: adjustedQuoteBalanceAmount,
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
                await this.balanceSnapshotService.updateBotSnapshotBalancesRecord({
                    bot,
                    targetBalanceAmount: adjustedTargetBalanceAmount,
                    quoteBalanceAmount: adjustedQuoteBalanceAmount,
                    gasAmount: adjustedGasBalanceAmount,
                    session,
                })
                let targetAmountReturned = after.targetTokenBalanceAmount.sub(before.targetTokenBalanceAmount)
                let quoteAmountReturned = after.quoteTokenBalanceAmount.sub(before.quoteTokenBalanceAmount)
                let gasAmountReturned = after.gasBalanceAmount.sub(before.gasBalanceAmount)
                const gasStatus = this.gasStatusService.getGasStatus({
                    targetTokenId: targetToken.displayId,
                    quoteTokenId: quoteToken.displayId,
                })
                switch (gasStatus) {
                case GasStatus.IsTarget: {
                    targetAmountReturned = targetAmountReturned.add(gasAmountReturned)
                    gasAmountReturned = new BN(0)
                    break
                }
                case GasStatus.IsQuote: {
                    quoteAmountReturned = quoteAmountReturned.add(gasAmountReturned)
                    gasAmountReturned = new BN(0)
                    break
                }
                default: {
                    break
                }
                }
                await this.closePositionSnapshotService.updateClosePositionTransactionRecord({
                    bot,
                    pnl,
                    roi,
                    positionId: bot.activePosition.id,
                    closeTxHash: txHash,
                    targetAmountReturned,
                    quoteAmountReturned,
                    gasAmountReturned,
                    session,
                    feesTxHash,
                    targetFeeAmount,
                    quoteFeeAmount,
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
        const targetToken = targetIsA ? tokenA : tokenB
        const quoteToken = targetIsA ? tokenB : tokenA
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
        let targetBalanceAmountUsed = new BN(snapshotTargetBalanceAmount)
            .sub(new BN(adjustedTargetBalanceAmount))
        let quoteBalanceAmountUsed = new BN(snapshotQuoteBalanceAmount)
            .sub(new BN(adjustedQuoteBalanceAmount))
        let gasBalanceAmountUsed = new BN(snapshotGasBalanceAmount || 0)
            .sub(new BN(adjustedGasBalanceAmount || 0))
        const gasStatus = this.gasStatusService.getGasStatus({
            targetTokenId: targetToken.displayId,
            quoteTokenId: quoteToken.displayId,
        })
        switch (gasStatus) {
        case GasStatus.IsTarget: {
            // gas token is the same as target token.
            // treat gas balance as part of the target balance used,
            // then mark gas usage as zero because it's merged.
            targetBalanceAmountUsed = targetBalanceAmountUsed.add(gasBalanceAmountUsed)
            gasBalanceAmountUsed = new BN(0)
            break
        }
        case GasStatus.IsQuote: {
            // gas token is the same as quote token.
            // treat gas balance as part of the quote balance used,
            // then clear gas usage since it's fully merged.
            quoteBalanceAmountUsed = quoteBalanceAmountUsed.add(gasBalanceAmountUsed)
            gasBalanceAmountUsed = new BN(0)
            break
        }
        }
        const session = await this.connection.startSession()
        await session.withTransaction(
            async () => {
                await this.openPositionSnapshotService.addOpenPositionTransactionRecord({
                    targetAmountUsed: targetBalanceAmountUsed,
                    quoteAmountUsed: quoteBalanceAmountUsed,
                    liquidity: new BN(liquidity),
                    gasAmountUsed: gasBalanceAmountUsed,
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
                    metadata: {
                        nftMintAddress: mintKeyPair.address.toString(),
                    }
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

