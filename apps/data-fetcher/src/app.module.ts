import { Module } from "@nestjs/common"
import { EnvModule } from "@modules/env"
import { AxiosModule } from "@modules/axios"
import { MongooseModule } from "@modules/databases"
import { CacheModule } from "@modules/cache"
import { PriceFetchersModule } from "./price-fetchers"
import { MixinModule } from "@modules/mixin"
import { PriceModule } from "@modules/blockchains/price"
import { ScheduleModule } from "@nestjs/schedule"
import { WinstonLevel, WinstonModule } from "@modules/winston"
import { LiquidityPoolsModule } from "@modules/blockchains"

@Module({
    imports: [
        ScheduleModule.forRoot(),
        EnvModule.forRoot(),
        MixinModule.register({
            isGlobal: true,
        }),
        AxiosModule.register({
            isGlobal: true,
        }),
        WinstonModule.register({
            isGlobal: true,
            appName: "data-fetcher",
            level: WinstonLevel.Debug,
        }),
        CacheModule.register({
            isGlobal: true,
        }),
        MongooseModule.register({
            withSeeders: true,
            withMemDb: true,
            isGlobal: true,
        }),
        PriceModule.register({
            isGlobal: true,
        }),
        LiquidityPoolsModule.register({
            isGlobal: true,
        }),
        PriceFetchersModule.register({
            isGlobal: true,
        }),
    ],
})
export class AppModule {}
