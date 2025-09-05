import { Module } from "@nestjs/common"
import { EnvModule } from "@modules/env"
import { AxiosModule } from "@modules/axios"
import { DatabasesModule } from "@modules/databases"
import { CacheModule } from "@modules/cache"
import { PriceFetchersModule } from "./price-fetchers"
import { MixinModule } from "@modules/mixin"

@Module({
    imports: [
        EnvModule.forRoot(),
        AxiosModule.register({
            isGlobal: true,
        }),
        MixinModule.register({
            isGlobal: true,
        }),
        DatabasesModule.register({
            isGlobal: true,
        }),
        CacheModule.register({
            isGlobal: true,
        }),
        PriceFetchersModule.register({
            isGlobal: true,
        }),
    ],
})
export class AppModule {}
