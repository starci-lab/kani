import { FeesParams, FeesResponse } from "../../interfaces"
import { Injectable } from "@nestjs/common"
import { RpcExecutorService } from "../../clients"
import { RpcAccessType } from "@modules/filesystem"
import { address, fetchEncodedAccount } from "@solana/kit"
import { ActivePositionNotFoundException, InvalidPoolTokensException, PositionNotFoundException } from "@exceptions"
import { Position } from "./beets"
import { BN } from "bn.js"
import { LiquidityPoolState } from "../../interfaces"
import { Q64 } from "@flowx-finance/sdk"
import { PrimaryMemoryStorageService } from "@modules/databases"
import { computeDenomination } from "@utils"

@Injectable()
export class OrcaFeesService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly rpcExecutorService: RpcExecutorService,
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
        const accountInfo = await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Read,
            callback: async ({ rpc }) => {
                const accountInfo = await fetchEncodedAccount(rpc, address(positionId))
                if (!accountInfo || !accountInfo.exists) {
                    throw new PositionNotFoundException("Position not found")
                }
                return accountInfo
            }
        })
        const tokenA = this.primaryMemoryStorageService.tokens.find(token => token.id === _state.static.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokens.find(token => token.id === _state.static.tokenB.toString())
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
        const [positionState] = Position.struct.deserialize(Buffer.from(accountInfo.data), 8)
        // retrieve from cache
        const feeGrowthGlobalA = _state.dynamic.feeGrowthGlobalA
        const feeGrowthGlobalB = _state.dynamic.feeGrowthGlobalB
        const feeGrowthCheckpointA = new BN(positionState.feeGrowthCheckpointA.toString())
        const feeGrowthCheckpointB = new BN(positionState.feeGrowthCheckpointB.toString())
        const feeEarnedA = _state.dynamic.liquidity.mul(feeGrowthGlobalA.sub(feeGrowthCheckpointA)).div(Q64)
        const feeEarnedB = _state.dynamic.liquidity.mul(feeGrowthGlobalB.sub(feeGrowthCheckpointB)).div(Q64)
        // calculate the fees
        return {
            tokenA: computeDenomination(feeEarnedA, tokenA.decimals),
            tokenB: computeDenomination(feeEarnedB, tokenB.decimals),
        }
    }
}