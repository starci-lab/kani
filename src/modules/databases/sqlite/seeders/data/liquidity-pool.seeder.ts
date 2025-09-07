import { Injectable, Logger } from "@nestjs/common"
import { DataSource } from "typeorm"
import { DexEntity, LiquidityPoolEntity, TokenEntity } from "../../entities"
import { DexId, TokenId } from "../../../enums"
import { liquidityPoolData } from "../../../data"
import { InjectDataSource } from "@nestjs/typeorm"

@Injectable()
export class LiquidityPoolSeeder {
    private readonly logger = new Logger(LiquidityPoolSeeder.name)
    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource
    ) { }

    async seed(): Promise<void> {
        this.logger.debug("Seeding LP pools...")
        const tokens = await this.dataSource.manager.find(TokenEntity)
        const dexes = await this.dataSource.manager.find(DexEntity)
        const findToken = (tokenId: TokenId) => tokens.find((token) => token.displayId === tokenId)!
        const findDex = (dexId: DexId) => dexes.find((dex) => dex.displayId === dexId)!
        await this.dataSource.manager.save(
            LiquidityPoolEntity,
            liquidityPoolData.map((liquidityPool) => ({
                id: liquidityPool.displayId,
                displayId: liquidityPool.displayId,
                fee: liquidityPool.fee,
                poolAddress: liquidityPool.poolAddress,
                dex: findDex(liquidityPool.dexId),
                tokenA: findToken(liquidityPool.tokenAId),
                tokenB: findToken(liquidityPool.tokenBId),
                tokenAId: liquidityPool.tokenAId,
                tokenBId: liquidityPool.tokenBId,
                dexId: liquidityPool.dexId,
                network: liquidityPool.network,
                chainId: liquidityPool.chainId,
            })),
        )
    }

    async drop(): Promise<void> {
        await this.dataSource.manager.clear(LiquidityPoolEntity)
    }
}


