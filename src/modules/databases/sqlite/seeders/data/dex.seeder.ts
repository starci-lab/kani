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
        await this.dataSource.manager.save(DexEntity, dexData)
    }

    async drop(): Promise<void> {
        const repo = this.dataSource.getRepository(DexEntity)
        await repo.delete({})
    }
}


