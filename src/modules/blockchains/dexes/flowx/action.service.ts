import { Injectable } from "@nestjs/common"
import {
    ClosePositionParams,
    IActionService,
    LiquidityPoolState,
    OpenPositionParams,
} from "../../interfaces"
import { ClmmLiquidityMath, ClmmTickMath } from "@flowx-finance/sdk"
import { Transaction } from "@mysten/sui/transactions"
import { SignerService } from "../../signers"
import BN from "bn.js"
import { InjectPrimaryMongoose, PrimaryMemoryStorageService } from "@modules/databases"
import { OpenPositionTxbService } from "./transactions"
import { TickMathService } from "../../math"
import { LoadBalancerName } from "@modules/databases"
import { LoadBalancerService } from "@modules/mixin"
import { SuiClient } from "@mysten/sui/client"
import { createEventName, EventName } from "@modules/event"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { Connection } from "mongoose"
import { BalanceService } from "../../balance"
import { GasStatusService } from "../../balance"
import { InvalidPoolTokensException } from "@exceptions"
import { GasStatus } from "../../types"
import { OpenPositionSnapshotService } from "../../snapshots"
import { BalanceSnapshotService } from "../../snapshots"
import { SwapTransactionSnapshotService } from "../../snapshots"

@Injectable()
export class FlowXActionService implements IActionService {
    constructor(
    private readonly signerService: SignerService,
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    private readonly openPositionTxbService: OpenPositionTxbService,
    private readonly tickMathService: TickMathService,
    private readonly loadBalancerService: LoadBalancerService,
    private readonly eventEmitter: EventEmitter2,
    @InjectPrimaryMongoose()
    private readonly connection: Connection,
    private readonly balanceService: BalanceService,
    private readonly gasStatusService: GasStatusService,
    private readonly openPositionSnapshotService: OpenPositionSnapshotService,
    private readonly balanceSnapshotService: BalanceSnapshotService,
    private readonly swapTransactionSnapshotService: SwapTransactionSnapshotService,
    ) {}

    /**
   * Open LP position on FlowX CLMM
   */
    async openPosition({
        bot,
        state,
    }: OpenPositionParams): Promise<void> {
        const _state = state as LiquidityPoolState
        const txb = new Transaction()
        if (!bot.snapshotTargetBalanceAmount || !bot.snapshotQuoteBalanceAmount || !bot.snapshotGasBalanceAmount) {
            throw new Error("Snapshot balances not set")
        }
        const snapshotTargetBalanceAmountBN = new BN(bot.snapshotTargetBalanceAmount)
        const snapshotQuoteBalanceAmountBN = new BN(bot.snapshotQuoteBalanceAmount)
        const snapshotGasBalanceAmountBN = new BN(bot.snapshotGasBalanceAmount)
        const { 
            tickLower, 
            tickUpper
        } = await this.tickMathService.getTickBounds({
            state: _state,
            bot,
        })
        const liquidity = ClmmLiquidityMath.maxLiquidityForAmounts(
            ClmmTickMath.tickIndexToSqrtPriceX64(_state.dynamic.tickCurrent),
            ClmmTickMath.tickIndexToSqrtPriceX64(tickLower.toNumber()),
            ClmmTickMath.tickIndexToSqrtPriceX64(tickUpper.toNumber()),
            snapshotTargetBalanceAmountBN,
            snapshotQuoteBalanceAmountBN,
            true
        )
        const tokenA = this.primaryMemoryStorageService.tokens.find((token) => token.id === _state.static.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokens.find((token) => token.id === _state.static.tokenB.toString())
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }       
        const targetIsA = bot.targetToken.toString() === tokenA.id
        const targetToken = targetIsA ? tokenA : tokenB
        const quoteToken = targetIsA ? tokenB : tokenA

        const { txb: openPositionTxb } = await this.openPositionTxbService.createOpenPositionTxb({
            txb,
            bot,
            amountAMax: snapshotTargetBalanceAmountBN,
            amountBMax: snapshotQuoteBalanceAmountBN,
            liquidity,
            tickLower,
            state: _state,
            tickUpper,
        })
        const url = this.loadBalancerService.balanceP2c(
            LoadBalancerName.FlowXClmm, 
            this.primaryMemoryStorageService.clientConfig.flowXClmmClientRpcs
        )
        const client = new SuiClient({
            url,
            network: "mainnet",
        })
        const { digest: txHash } = await this.signerService.withSuiSigner({
            bot,
            action: async (signer) => {
                const stimuateTransaction = await client.devInspectTransactionBlock({
                    transactionBlock: openPositionTxb,
                    sender: signer.toSuiAddress(),
                })
                console.log(stimuateTransaction)
                throw new Error("Not implemented")
                return await client.signAndExecuteTransaction({
                    transaction: openPositionTxb,
                    signer,
                })
            },
        })
        const {
            balancesSnapshotsParams,
            swapsSnapshotsParams,
        } = await this.balanceService.executeBalanceRebalancing({
            bot,
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
                    chainId: bot.chainId,
                    liquidityPoolId: _state.static.displayId,
                    positionId: "TODO: get position id",
                    openTxHash: txHash,
                    session,
                    feeAmountTarget: targetIsA ? new BN(0) : new BN(0),
                    feeAmountQuote: targetIsA ? new BN(0) : new BN(0),
                })
                await this.balanceSnapshotService.updateBotSnapshotBalancesRecord({
                    bot,
                    targetBalanceAmount: balancesSnapshotsParams?.targetBalanceAmount || new BN(0),
                    quoteBalanceAmount: balancesSnapshotsParams?.quoteBalanceAmount || new BN(0),
                    gasAmount: balancesSnapshotsParams?.gasAmount || new BN(0),
                    targetBalanceAmountBeforeOpen: new BN(snapshotTargetBalanceAmountBN),
                    quoteBalanceAmountBeforeOpen: new BN(snapshotQuoteBalanceAmountBN),
                    gasAmountBeforeOpen: new BN(snapshotGasBalanceAmountBN),
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
        this.eventEmitter.emit(
            createEventName(
                EventName.PositionOpened, {
                    botId: bot.id,
                })
        )
    }

    async closePosition({
        bot,
        state,
    }: ClosePositionParams): Promise<void> {
        console.log("closePosition", bot, state)
        throw new Error("Not implemented")
    }
}