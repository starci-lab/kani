import { Injectable, Logger } from "@nestjs/common"
import { DataSource } from "typeorm"
import { DexEntity, LpPoolEntity, TokenEntity } from "../../entities"
import { DexId, LpPoolId, TokenId } from "../../../enums"
import { Network } from "@modules/common"

@Injectable()
export class LpPoolSeeder {
    private readonly logger = new Logger(LpPoolSeeder.name)
    constructor(private readonly dataSource: DataSource) {}

    async seed(): Promise<void> {
        this.logger.debug("Seeding LP pools (sqlite)...")
        const tokenRepo = this.dataSource.getRepository(TokenEntity)
        const dexRepo = this.dataSource.getRepository(DexEntity)
        const poolRepo = this.dataSource.getRepository(LpPoolEntity)

        const tokens = await tokenRepo.find()
        const cetus = await dexRepo.findOne({ where: { displayId: DexId.Cetus } })
        const find = (id: TokenId) => tokens.find((t) => t.displayId === id)!

        await poolRepo.save(
            poolRepo.create([
                {
                    displayId: LpPoolId.CetusSuiIka02,
                    fee: 0.002,
                    poolAddress:
                        "0xc23e7e8a74f0b18af4dfb7c3280e2a56916ec4d41e14416f85184a8aab6b7789",
                    tokenA: find(TokenId.SuiIka),
                    tokenB: find(TokenId.SuiUsdc),
                    network: Network.Mainnet,
                    dex: cetus!,
                },
                {
                    displayId: LpPoolId.CetusSuiUsdc005,
                    fee: 0.0005,
                    poolAddress:
                        "0x51e883ba7c0b566a26cbc8a94cd33eb0abd418a77cc1e60ad22fd9b1f29cd2ab",
                    tokenA: find(TokenId.SuiUsdc),
                    tokenB: find(TokenId.SuiCetus),
                    network: Network.Mainnet,
                    dex: cetus!,
                },
            ]),
        )
    }

    async drop(): Promise<void> {
        const repo = this.dataSource.getRepository(LpPoolEntity)
        await repo.delete({})
    }
}


