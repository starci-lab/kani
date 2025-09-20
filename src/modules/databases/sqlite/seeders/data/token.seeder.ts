import { Injectable, Logger } from "@nestjs/common"
import { DataSource } from "typeorm"
import { LiquidityPoolEntity, TokenEntity } from "../../entities"
import { tokenData } from "../../../data"
import { CexId } from "@modules/databases/enums"

@Injectable()
export class TokenSeeder {
    private readonly logger = new Logger(TokenSeeder.name)
    constructor(

        private readonly dataSource: DataSource
    ) { }

    async seed(): Promise<void> {
        this.logger.debug("Seeding tokens...")
        await this.dataSource.manager.save(
            TokenEntity, 
            tokenData.map(
                (token) => ({
                    ...token,
                    binanceSymbol: token.cexSymbols?.[CexId.Binance],
                    bybitSymbol: token.cexSymbols?.[CexId.Bybit],
                    gateSymbol: token.cexSymbols?.[CexId.Gate],
                    id: token.displayId,
                })
            )
        )
    }

    async drop(): Promise<void> {
        await this.dataSource.manager.clear(LiquidityPoolEntity)
    }
}


