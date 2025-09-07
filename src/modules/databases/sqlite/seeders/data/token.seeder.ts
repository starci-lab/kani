import { Injectable, Logger } from "@nestjs/common"
import { DataSource } from "typeorm"
import { LiquidityPoolEntity, TokenEntity } from "../../entities"
import { tokenData } from "../../../data"

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
            tokenData
        )
    }

    async drop(): Promise<void> {
        await this.dataSource.manager.clear(LiquidityPoolEntity)
    }
}


