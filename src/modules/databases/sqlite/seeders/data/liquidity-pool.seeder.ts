import { Injectable, Logger } from "@nestjs/common"
import { DataSource } from "typeorm"
import { DexEntity, LiquidityPoolEntity, TokenEntity } from "../../entities"
import { DexId, TokenId } from "../../../enums"
import { lpPoolData } from "../../../data"
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
            lpPoolData.map((lpPool) => ({
                displayId: lpPool.displayId,
                fee: lpPool.fee,
                poolAddress: lpPool.poolAddress,
                dex: findDex(lpPool.dexId),
                tokenA: findToken(lpPool.tokenAId),
                tokenB: findToken(lpPool.tokenBId),
                tokenAId: lpPool.tokenAId,
                tokenBId: lpPool.tokenBId,
                dexId: lpPool.dexId,
                network: lpPool.network,
            })),
        )
    }

    async drop(): Promise<void> {
        await this.dataSource.manager.clear(LiquidityPoolEntity)
    }
}


