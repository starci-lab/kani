import { LiquidityPoolNotFoundException } from "@exceptions"
import { PositionSchema, PrimaryMemoryStorageService } from "@modules/databases"
import { Injectable } from "@nestjs/common"

@Injectable()
export class AttachLiquidityPoolService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    async attachLiquidityPoolToPosition(
        position: PositionSchema
    ): Promise<void> {
        const liquidityPool = this.primaryMemoryStorageService.liquidityPools.find(
            liquidityPool => liquidityPool.id.toString() === position.liquidityPool.toString()
        )
        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException("Invalid liquidity pool")
        }
        position.associatedLiquidityPool = liquidityPool
    }
}   