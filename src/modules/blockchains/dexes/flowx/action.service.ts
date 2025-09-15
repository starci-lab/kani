/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from "@nestjs/common"
import {
    ClosePositionParams,
    IActionService,
    OpenPositionParams,
} from "../interfaces"
import { InjectFlowXClmmSdks } from "./flowx.decorators"
import { Network } from "../../../common"
import { ClmmPosition, Percent, CoinAmount } from "@flowx-finance/sdk"
import { ActionResponse } from "../types"
import { Transaction } from "@mysten/sui/transactions"
import {
    TickManagerService,
    FeeToService,
    GasSuiSwapUtilsService,
    OPEN_POSITION_SLIPPAGE,
} from "../../../blockchains"
import { InjectSuiClients } from "../../clients"
import { SignerService } from "../../signers"
import { SuiClient } from "@mysten/sui/client"
import BN from "bn.js"
import { FlowXClmmSdk } from "./flowx.providers"
import { SuiExecutionService } from "../../utils"
import { clientIndex } from "./inner-constants"

@Injectable()
export class FlowXActionService implements IActionService {
    constructor(
    @InjectFlowXClmmSdks()
    private readonly flowxClmmSdks: Record<Network, FlowXClmmSdk>,
    private readonly tickManagerService: TickManagerService,
    private readonly feeToService: FeeToService,
    private readonly gasSuiSwapUtilsService: GasSuiSwapUtilsService,
    @InjectSuiClients()
    private readonly suiClients: Record<Network, Array<SuiClient>>,
    private readonly signerService: SignerService,
    private readonly suiExecutionService: SuiExecutionService,
    ) {}

    /**
   * Open LP position on FlowX CLMM
   */
    async openPosition({
        pool,
        network = Network.Mainnet,
        tokenAId,
        tokenBId,
        tokens,
        priorityAOverB,
        accountAddress,
        slippage,
        txb,
        amount,
        user,
        suiClient
    }: OpenPositionParams): Promise<ActionResponse> {
        slippage = slippage || OPEN_POSITION_SLIPPAGE
        suiClient = suiClient || this.suiClients[network][clientIndex]
        if (!user) {
            throw new Error("User is required")
        }
        txb = txb || new Transaction()
        const flowxSdk = this.flowxClmmSdks[network]
        const positionManager = flowxSdk.positionManager

        const tokenA = tokens.find((t) => t.displayId === tokenAId)
        const tokenB = tokens.find((t) => t.displayId === tokenBId)
        if (!tokenA || !tokenB) throw new Error("Token not found")
        if (!pool.flowXClmmPool) throw new Error("FlowX CLMM pool not found")

        // Ensure gas for transaction
        const {
            txb: txAfterSwapGas,
            requireGasSwap,
            remainingAmount,
        } = await this.gasSuiSwapUtilsService.gasSuiSwap({
            network,
            accountAddress,
            tokenInId: priorityAOverB ? tokenA.displayId : tokenB.displayId,
            tokens,
            txb,
            slippage,
            suiClient,
        })
        if (requireGasSwap && !remainingAmount) {
            throw new Error("Remaining amount after swap gas is missing")
        }

        // Attach platform fee
        const { txb: txAfterAttachFee } = await this.feeToService.attachSuiFee({
            txb: txAfterSwapGas,
            tokenAddress: (priorityAOverB ? tokenA : tokenB).tokenAddress,
            accountAddress,
            network,
            amount: remainingAmount || amount,
            suiClient,
        })

        // Tick bounds
        const { tickLower, tickUpper } = this.tickManagerService.tickBounds(pool)

        // Build position (single-sided)
        let position: ClmmPosition
        if (priorityAOverB) {
            position = ClmmPosition.fromAmountX({
                owner: accountAddress,
                pool: pool.flowXClmmPool,
                tickLower,
                tickUpper,
                amountX: new BN((remainingAmount || amount).toString()),
                useFullPrecision: true,
            })
        } else {
            position = ClmmPosition.fromAmountY({
                owner: accountAddress,
                pool: pool.flowXClmmPool,
                tickLower,
                tickUpper,
                amountY: new BN((remainingAmount || amount).toString()),
                useFullPrecision: true,
            })
        }

        // Increase liquidity
        const options = {
            slippageTolerance: new Percent(Math.floor(slippage * 100), 10000),
            deadline: Date.now() + 3600 * 1000,
            createPosition: true,
        }
        positionManager.tx(
            txAfterAttachFee as any
        ).increaseLiquidity(position, options)

        const txHash = await this.signerService.withSuiSigner({
            user,
            network,
            action: async (signer) => {
                return await this.suiExecutionService.signAndExecuteTransaction({
                    transaction: txAfterAttachFee,
                    suiClient,
                    signer,
                })
            },
        })
        return { txHash }
    }

    /**
   * Close LP position on FlowX CLMM
   */
    async closePosition({
        pool,
        position,
        network = Network.Mainnet,
        txb,
        accountAddress,
        user,
        suiClient
    }: ClosePositionParams): Promise<ActionResponse> {
        if (!user) {
            throw new Error("User is required")
        }
        suiClient = suiClient || this.suiClients[network][clientIndex]
        txb = txb || new Transaction()
        const flowxSdk = this.flowxClmmSdks[network]
        const positionManager = flowxSdk.positionManager
        const MaxU64 = new BN("18446744073709551615")

        // Load on-chain position
        const positionToClose = await positionManager.getPosition(position.positionId)

        // Remove all liquidity
        const closeOptions = {
            slippageTolerance: new Percent(1, 100),
            deadline: Date.now() + 3600 * 1000,
            collectOptions: {
                expectedCoinOwedX: CoinAmount.fromRawAmount(pool.token0 as any, MaxU64),
                expectedCoinOwedY: CoinAmount.fromRawAmount(pool.token1 as any, MaxU64),
            },
        }
        positionManager
            .tx(txb as any)
            .decreaseLiquidity(positionToClose, closeOptions)

        // Collect all rewards if available
        const rewards = await positionToClose.getRewards()
        for (let i = 0; i < rewards.length; i++) {
            if (rewards[i].gt(new BN(0))) {
                const collectRewardOptions = {
                    expectedRewardOwed: CoinAmount.fromRawAmount(
                        positionToClose.pool.poolRewards[i].coin as any,
                        MaxU64,
                    ),
                    recipient: accountAddress,
                }
                console.log(collectRewardOptions)
                positionManager
                    .collectPoolReward(positionToClose, i as any)
            }
        }

        // Close the NFT position
        positionManager
            .tx(txb as any)
            .closePosition(positionToClose)

        const txHash = await this.signerService.withSuiSigner({
            user,
            network,
            action: async (signer) => {
                return await this.suiExecutionService.signAndExecuteTransaction({
                    transaction: txb,
                    suiClient,
                    signer,
                })
            },
        })
        return { txHash }
    }
}