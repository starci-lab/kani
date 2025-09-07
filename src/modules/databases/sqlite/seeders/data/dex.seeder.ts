import { Injectable, Logger } from "@nestjs/common"
import { DataSource } from "typeorm"
import { DexEntity } from "../../entities"
import { DexId } from "@modules/databases/enums"

@Injectable()
export class DexSeeder {
    private readonly logger = new Logger(DexSeeder.name)
    constructor(private readonly dataSource: DataSource) {}

    async seed(): Promise<void> {
        this.logger.debug("Seeding dexes (sqlite)...")
        const repo = this.dataSource.getRepository(DexEntity)
        await repo.save(
            repo.create({
                displayId: DexId.Cetus,
                name: "Cetus",
                description: "Cetus is a decentralized exchange on Sui.",
                website: "https://cetus.zone/",
                iconUrl: "https://assets.coingecko.com/coins/images/32311/large/cetus.png",
            }),
        )
    }

    async drop(): Promise<void> {
        const repo = this.dataSource.getRepository(DexEntity)
        await repo.delete({})
    }
}


