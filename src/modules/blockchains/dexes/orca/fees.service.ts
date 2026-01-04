import { FeesParams, FeesResponse } from "../../interfaces"
import { Injectable } from "@nestjs/common"
import { RpcExecutorService } from "../../clients"
import { RpcAccessType } from "@modules/filesystem"
import { address, fetchEncodedAccount } from "@solana/kit"
import { 
    ActivePositionLiquidityNotSetException, 
    ActivePositionNotFoundException, 
    InvalidPoolTokensException, 
    PositionNotFoundException,
    TickArrayNotFoundException
} from "@exceptions"
import { Position } from "./beets"
import { decodeTickArray } from "@orca-so/whirlpools-client"
import BN from "bn.js"
import { LiquidityPoolState } from "../../interfaces"
import { Q64 } from "@flowx-finance/sdk"
import { OrcaLiquidityPoolMetadata, PrimaryMemoryStorageService } from "@modules/databases"
import { computeDenomination } from "@utils"
import { TickArrayService } from "./transactions"
import { Decimal } from "decimal.js"

@Injectable()
export class OrcaFeesService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly tickArrayService: TickArrayService,
    ) { }

    async fees(
        {
            bot,
            state,
        }: FeesParams
    ): Promise<FeesResponse> {
        const _state = state as LiquidityPoolState
        // get the fees for the position
        if (!bot.activePosition) throw new ActivePositionNotFoundException("Active position not found")
        const positionId = bot.activePosition.positionId
        const accountInfo = await this.rpcExecutorService.withSolanaRpc(
            {
                accessType: RpcAccessType.Read,
                callback: async ({ rpc }) => {
                    const accountInfo = await fetchEncodedAccount(rpc, address(positionId))
                    if (!accountInfo || !accountInfo.exists) {
                        throw new PositionNotFoundException("Position not found")
                    }
                    return accountInfo
                }
            }
        )
        const tokenA = this.primaryMemoryStorageService.tokens.find(token => token.id === _state.static.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokens.find(token => token.id === _state.static.tokenB.toString())
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
        const [positionState] = Position.struct.deserialize(Buffer.from(accountInfo.data), 8)
        const tickUpper = bot.activePosition.tickUpper ?? 0
        const tickLower = bot.activePosition.tickLower ?? 0
        const { programAddress } = state.static.metadata as OrcaLiquidityPoolMetadata
        const { pda: tickArrayUpperPda } = await this.tickArrayService.getPda({
            poolStateAddress: address(state.static.poolAddress),
            tickIndex: tickUpper,
            tickSpacing: state.static.tickSpacing,
            bot,
            pdaOnly: true,
            programAddress: address(programAddress),
        })
        const { pda: tickArrayLowerPda } = await this.tickArrayService.getPda({
            poolStateAddress: address(state.static.poolAddress),
            tickIndex: tickLower,
            tickSpacing: state.static.tickSpacing,
            bot,
            pdaOnly: true,
            programAddress: address(programAddress),
        })
        // fetch the onchain account info for the tick arrays
        const tickArrayUpper = await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Read,
            callback: async ({ rpc }) => {
                const accountInfo = await fetchEncodedAccount(rpc, tickArrayUpperPda)
                if (!accountInfo || !accountInfo.exists) {
                    throw new TickArrayNotFoundException(tickUpper, "Tick array not found")
                }
                return decodeTickArray(accountInfo)
            },
        })
        const tickArrayLower = await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Read,
            callback: async ({ rpc }) => {
                const accountInfo = await fetchEncodedAccount(rpc, tickArrayLowerPda)
                if (!accountInfo || !accountInfo.exists) {
                    throw new TickArrayNotFoundException(tickLower, "Tick array not found")
                }
                return decodeTickArray(accountInfo)
            },
        })
        const lowerStart = tickArrayLower.data.startTickIndex
        const upperStart = tickArrayUpper.data.startTickIndex

        const tickLowerIndex = new Decimal(tickLower).sub(new Decimal(lowerStart)).div(new Decimal(state.static.tickSpacing))
        const tickUpperIndex = new Decimal(tickUpper).sub(new Decimal(upperStart)).div(new Decimal(state.static.tickSpacing))

        if (
            tickLowerIndex.lessThan(0) ||
  tickLowerIndex.greaterThanOrEqualTo(tickArrayLower.data.ticks.length)
        ) {
            throw new Error("Lower tick index out of range")
        }

        if (
            tickUpperIndex.lessThan(0) ||
  tickUpperIndex.greaterThanOrEqualTo(tickArrayUpper.data.ticks.length)
        ) {
            throw new Error("Upper tick index out of range")
        }

        const tickLowerData = tickArrayLower.data.ticks[tickLowerIndex.toNumber()]
        const tickUpperData = tickArrayUpper.data.ticks[tickUpperIndex.toNumber()]
        // calculate the fee growth inside
        const feeGrowthInsideA = this.computeFeeGrowthInside(
            _state.dynamic.feeGrowthGlobalA,
            new BN(tickLowerData.feeGrowthOutsideA.toString()),
            new BN(tickUpperData.feeGrowthOutsideA.toString()),
            _state.dynamic.tickCurrent,
            tickLower,
            tickUpper,
        )
          
        const feeGrowthInsideB = this.computeFeeGrowthInside(
            _state.dynamic.feeGrowthGlobalB,
            new BN(tickLowerData.feeGrowthOutsideB.toString()),
            new BN(tickUpperData.feeGrowthOutsideB.toString()),
            _state.dynamic.tickCurrent,
            tickLower,
            tickUpper,
        )
        // get the fee growth checkpoint for the position
        const feeGrowthCheckpointA = new BN(positionState.feeGrowthCheckpointA.toString())
        const feeGrowthCheckpointB = new BN(positionState.feeGrowthCheckpointB.toString())
        // get the liquidity for the position
        if (!bot.activePosition.liquidity) {
            throw new ActivePositionLiquidityNotSetException(bot.id, "Active position liquidity not set")
        }
        // calculate the fees earned
        const liquidity = new BN(bot.activePosition.liquidity)
        const feeEarnedA = liquidity.mul(feeGrowthInsideA.sub(feeGrowthCheckpointA)).div(Q64)
        const feeEarnedB = liquidity.mul(feeGrowthInsideB.sub(feeGrowthCheckpointB)).div(Q64)
        // return the fees
        return {
            tokenA: computeDenomination(feeEarnedA, tokenA.decimals),
            tokenB: computeDenomination(feeEarnedB, tokenB.decimals),
        }
    }

    computeFeeGrowthInside(
        feeGrowthGlobal: BN,
        feeGrowthOutsideLower: BN,
        feeGrowthOutsideUpper: BN,
        currentTick: number,
        tickLower: number,
        tickUpper: number,
    ): BN {
        if (currentTick < tickLower) {
            return feeGrowthOutsideLower.sub(feeGrowthOutsideUpper)
        }
      
        if (currentTick >= tickUpper) {
            return feeGrowthOutsideUpper.sub(feeGrowthOutsideLower)
        }
      
        return feeGrowthGlobal
            .sub(feeGrowthOutsideLower)
            .sub(feeGrowthOutsideUpper)
    }
}