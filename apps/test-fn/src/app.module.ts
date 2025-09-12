import { BlockchainCoreModule, KeypairsModule } from "@modules/blockchains"
import { Module } from "@nestjs/common"
import { UserLoaderModule } from "@features/fetchers"
// import { TestSwapService } from "./test-swap.service"
import { SqliteModule } from "@modules/databases"
import { TurbosTestLiquidityManangementService } from "./turbos-test-liquidity-manangement.service"

@Module({
    imports: [
        BlockchainCoreModule.register({
            isGlobal: true,
            useSelfImports: true,
            useGcpKms: false,
        }),
        SqliteModule.register({
            withSeeders: true,
            isGlobal: true,
        }),
        KeypairsModule.register({
            isGlobal: true
        }),
        UserLoaderModule.register({
            isGlobal: true,
        })
    ],
    providers: [
        //TestSwapService
        TurbosTestLiquidityManangementService
    ],
})
export class AppModule {}
