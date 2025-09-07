import { Injectable, Logger } from "@nestjs/common"
import { DataSource } from "typeorm"
import { DexEntity } from "../../entities"
import { dexData } from "../../../data"

@Injectable()
export class DexSeeder {
    private readonly logger = new Logger(DexSeeder.name)
    constructor(private readonly dataSource: DataSource) {}

    async seed(): Promise<void> {
        this.logger.debug("Seeding dexes...")
        await this.dataSource.manager.save(DexEntity, dexData.map(
            (dex) => ({
                ...dex,
                id: dex.displayId,                
            })
        ))
    }

    async drop(): Promise<void> {
        await this.dataSource.manager.clear(DexEntity)
    }
}


