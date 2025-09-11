import { BlockchainCoreModule, KeypairsModule } from "@modules/blockchains"
import { Module } from "@nestjs/common"
import { AppService } from "./app.service"
import { UserLoaderModule } from "@features/fetchers"
import { SqliteModule } from "@modules/databases"

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
    providers: [AppService],
})
export class AppModule {}
