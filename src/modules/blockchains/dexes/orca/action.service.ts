import { Injectable } from "@nestjs/common"
import { ClosePositionParams, IActionService, LiquidityPoolState, OpenPositionParams } from "../../interfaces"
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
    SnapshotBalancesBeforeOpenNotSetException,
    TokenNotFoundException,
} from "@exceptions"
import { TickMathService } from "../../math"
import { Network } from "@typedefs"
import { ORCA_CLIENTS_INDEX } from "./constants"
import { DynamicLiquidityPoolInfo, InjectSolanaClients } from "@modules/blockchains"
import { OPEN_POSITION_SLIPPAGE } from "../../swap"
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
import { 
    BalanceService, 
} from "../../balance"
import { 
    BalanceSnapshotService, 
    ClosePositionSnapshotService, 
    OpenPositionSnapshotService, 
    SwapTransactionSnapshotService 
} from "../../snapshots"
import { 
    ClosePositionInstructionService, 
    OpenPositionInstructionService
} from "./transactions"
import { adjustSlippage, httpsToWss } from "@utils"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import Decimal from "decimal.js"
import { GasStatusService } from "../../balance"
import { GasStatus } from "../../types"
import { CalculateProfitability, ProfitabilityMathService } from "../../math"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { createEventName, EventName } from "@modules/event"

@Injectable()
export class OrcaActionService implements IActionService {
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
        private readonly profitabilityMathService: ProfitabilityMathService,
        private readonly openPositionInstructionService: OpenPositionInstructionService,
        private readonly gasStatusService: GasStatusService,
        private readonly closePositionInstructionService: ClosePositionInstructionService,
        private readonly swapTransactionSnapshotService: SwapTransactionSnapshotService,
        private readonly eventEmitter: EventEmitter2,
        @InjectWinston()
        private readonly logger: WinstonLogger,
    ) { }

    async closePosition(
        params: ClosePositionParams
    ): Promise<void> {
        const {
            bot,
            state,
        } = params
        const _state = state as LiquidityPoolState
        if (!bot.activePosition) 
        {
            throw new ActivePositionNotFoundException(
                bot.id, 
                "Active position not found"
            )
        }
        const targetToken = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === bot.targetToken.toString()
        )
        if (!targetToken) {
            throw new TokenNotFoundException("Target token not found")
        }
        const quoteToken = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === bot.quoteToken.toString()
        )
        if (!quoteToken) {
            throw new TokenNotFoundException("Quote token not found")
        }
        // we have many close conditions
        // 1. the position is out-of-range, we close immediately
        // 2. our detection find a potential dump from CEX
        // 3. the position is not profitable, we close it  
        const shouldProceedAfterIsPositionOutOfRange = await this.assertIsPositionOutOfRange({
            bot,
            state: _state,
        })
        if (!shouldProceedAfterIsPositionOutOfRange) {
            return
        }
    }

    private async assertIsPositionOutOfRange(
        params: ClosePositionParams
    ): Promise<boolean> {
        const {
            bot,
            state,
        } = params
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException(
                bot.id, 
                "Active position not found"
            )
        }
        const _state = state.dynamic as DynamicLiquidityPoolInfo
        if (
            new Decimal(_state.tickCurrent).gte(bot.activePosition.tickLower || 0) 
            && new Decimal(_state.tickCurrent).lte(bot.activePosition.tickUpper || 0)
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
        await this.proccessClosePositionTransaction(params)
        // return false to terminate the assertion
        this.eventEmitter.emit(
            createEventName(
                EventName.UpdateActiveBot, 
                {
                    botId: bot.id,
                }
            )
        )
        return false
    }

    private async proccessClosePositionTransaction(
        {
            bot,
            state
        }: ClosePositionParams
    ): Promise<void> {
        const _state = state as LiquidityPoolState
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException(
                bot.id, 
                "Active position not found"
            )
        }
        const {
            snapshotTargetBalanceAmountBeforeOpen,
            snapshotQuoteBalanceAmountBeforeOpen,
            snapshotGasBalanceAmountBeforeOpen,
        } = bot
        if (
            !snapshotTargetBalanceAmountBeforeOpen || 
            !snapshotQuoteBalanceAmountBeforeOpen || 
            !snapshotGasBalanceAmountBeforeOpen
        ) {
            throw new SnapshotBalancesBeforeOpenNotSetException("Snapshot balances before open not set")
        }
        const network = Network.Mainnet
        const client = this.solanaClients[network].http[ORCA_CLIENTS_INDEX]
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
        const targetIsA = bot.targetToken.toString() === state.static.tokenA.toString()
        const targetToken = targetIsA ? tokenA : tokenB
        const quoteToken = targetIsA ? tokenB : tokenA
        const closePositionInstructions = await this.closePositionInstructionService.createCloseInstructions({
            bot,
            state: _state,
            clientIndex: ORCA_CLIENTS_INDEX,
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
                        maxRetries: BigInt(5),
                    })
                this.logger.info(
                    WinstonLog.ClosePositionSuccess, {
                        txHash: transactionSignature.toString(),
                        bot: bot.id,
                        liquidityPoolId: _state.static.displayId,
                    })
                return transactionSignature.toString()
            },
        })

        const {
            balancesSnapshotsParams,
            swapsSnapshotsParams,
        } = await this.balanceService.executeBalanceRebalancing({
            bot,
            clientIndex: ORCA_CLIENTS_INDEX,
            withoutSnapshot: true,
        })
        const before: CalculateProfitability = {
            targetTokenBalanceAmount: new BN(snapshotTargetBalanceAmountBeforeOpen),
            quoteTokenBalanceAmount: new BN(snapshotQuoteBalanceAmountBeforeOpen),
            gasBalanceAmount:  new BN(snapshotGasBalanceAmountBeforeOpen),
        }
        const after: CalculateProfitability = {
            targetTokenBalanceAmount: new BN(balancesSnapshotsParams?.targetBalanceAmount || 0),
            quoteTokenBalanceAmount: new BN(balancesSnapshotsParams?.quoteBalanceAmount || 0),
            gasBalanceAmount: new BN(balancesSnapshotsParams?.gasAmount || 0),
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
                    targetBalanceAmount: balancesSnapshotsParams?.targetBalanceAmount || new BN(0),
                    quoteBalanceAmount: balancesSnapshotsParams?.quoteBalanceAmount || new BN(0),
                    gasAmount: balancesSnapshotsParams?.gasAmount || new BN(0),
                    session,
                })
                await this.closePositionSnapshotService
                    .updateClosePositionTransactionRecord({
                        bot,
                        pnl,
                        roi,
                        positionId: bot.activePosition.id,
                        closeTxHash: txHash,
                        session,
                    })
                if (swapsSnapshotsParams) {
                    await this.swapTransactionSnapshotService.addSwapTransactionRecord({
                        ...swapsSnapshotsParams,
                        session,
                    })
                }
            })
    }

    async openPosition(
        {
            state,
            bot,
        }: OpenPositionParams
    ) {
        // cast the state to LiquidityPoolState
        const _state = state as LiquidityPoolState
        const network = Network.Mainnet
        const slippage = OPEN_POSITION_SLIPPAGE
        const targetIsA = bot.targetToken.toString() === _state.static.tokenA.toString()
        const {
            snapshotTargetBalanceAmount,
            snapshotQuoteBalanceAmount,
            snapshotGasBalanceAmount,
        } = bot
        if (!snapshotTargetBalanceAmount || !snapshotQuoteBalanceAmount || !snapshotGasBalanceAmount) {
            throw new SnapshotBalancesNotSetException("Snapshot balances not set")
        }
        const snapshotTargetBalanceAmountBN = new BN(snapshotTargetBalanceAmount)
        const snapshotQuoteBalanceAmountBN = new BN(snapshotQuoteBalanceAmount)
        const snapshotGasBalanceAmountBN = new BN(snapshotGasBalanceAmount)

        const client = this.solanaClients[network].http[ORCA_CLIENTS_INDEX]
        const rpc = createSolanaRpc(client.rpcEndpoint)
        const rpcSubscriptions = createSolanaRpcSubscriptions(httpsToWss(client.rpcEndpoint))
        // check if the tokens are in the pool
        const tokenA = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === _state.static.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === _state.static.tokenB.toString())
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
            state: _state,
            bot,
        })
        const sqrtPriceCurrentX64 = SqrtPriceMath.getSqrtPriceX64FromTick(
            _state.dynamic.tickCurrent,
        )
        const sqrtPriceLowerX64 = SqrtPriceMath.getSqrtPriceX64FromTick(
            tickLower.toNumber(),
        )
        const sqrtPriceUpperX64 = SqrtPriceMath.getSqrtPriceX64FromTick(
            tickUpper.toNumber(),
        )
        const amountA = targetIsA ? new BN(snapshotTargetBalanceAmount) : new BN(snapshotQuoteBalanceAmount)
        const amountB = targetIsA ? new BN(snapshotQuoteBalanceAmount) : new BN(snapshotTargetBalanceAmount)
        const liquidityRaw = 
            LiquidityMath.getLiquidityFromTokenAmounts(
                sqrtPriceCurrentX64,
                sqrtPriceLowerX64,
                sqrtPriceUpperX64,
                amountA,
                amountB,
            )
        const liquidity = adjustSlippage(
            liquidityRaw,
            slippage,
        )
        // open the position
        const {
            mintKeyPair,
            ataAddress,
            instructions: openPositionInstructions,
            feeAmountA,
            feeAmountB,
        } = await this.openPositionInstructionService.createOpenPositionInstructions({
            bot,
            state: _state,
            clientIndex: ORCA_CLIENTS_INDEX,
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
                        maxRetries: BigInt(5),
                    })
                this.logger.info(
                    WinstonLog.OpenPositionSuccess, {
                        txHash: transactionSignature.toString(),
                        bot: bot.id,
                        liquidityPoolId: _state.static.displayId,
                    })
                return transactionSignature.toString()
            },
        })
        // we refetch the balances after the position is opened
        const {
            balancesSnapshotsParams,
            swapsSnapshotsParams,
        } = await this.balanceService.executeBalanceRebalancing({
            bot,
            clientIndex: ORCA_CLIENTS_INDEX,
            withoutSnapshot: true,
        })
        let targetBalanceAmountUsed = snapshotTargetBalanceAmountBN
            .sub(new BN(balancesSnapshotsParams?.targetBalanceAmount || 0))
        let quoteBalanceAmountUsed = snapshotQuoteBalanceAmountBN
            .sub(new BN(balancesSnapshotsParams?.quoteBalanceAmount || 0))
        let gasBalanceAmountUsed = snapshotGasBalanceAmountBN
            .sub(new BN(balancesSnapshotsParams?.gasAmount || 0))
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
        // update the snapshot balances
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
                    liquidityPoolId: _state.static.displayId,
                    positionId: ataAddress.toString(),
                    openTxHash: txHash,
                    session,
                    feeAmountTarget: targetIsA ? feeAmountA : feeAmountB,
                    feeAmountQuote: targetIsA ? feeAmountB : feeAmountA,
                    metadata: {
                        nftMintAddress: mintKeyPair.address.toString(),
                    }
                })
                await this.balanceSnapshotService.updateBotSnapshotBalancesRecord({
                    bot,
                    targetBalanceAmount: balancesSnapshotsParams?.targetBalanceAmount || new BN(0),
                    quoteBalanceAmount: balancesSnapshotsParams?.quoteBalanceAmount || new BN(0),
                    gasAmount: balancesSnapshotsParams?.gasAmount || new BN(0),
                    targetBalanceAmountBeforeOpen: new BN(snapshotTargetBalanceAmount),
                    quoteBalanceAmountBeforeOpen: new BN(snapshotQuoteBalanceAmount),
                    gasAmountBeforeOpen: new BN(snapshotGasBalanceAmount),
                    session,
                })
                if (swapsSnapshotsParams) {
                    await this.swapTransactionSnapshotService.addSwapTransactionRecord({
                        ...swapsSnapshotsParams,
                        session,
                    })
                }
            })
        this.eventEmitter.emit(
            createEventName(
                EventName.UpdateActiveBot, {
                    botId: bot.id,
                })
        )
    }
}

