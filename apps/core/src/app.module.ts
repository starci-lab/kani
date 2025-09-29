import { Module } from "@nestjs/common"
import { HttpModule } from "@interfaces/http"
import { CacheModule } from "@modules/cache"
import { EnvModule } from "@modules/env"
import { MongooseModule } from "@modules/databases"
import { PassportModule } from "@modules/passport"
import { JwtModule } from "@nestjs/jwt"
import { WinstonLevel, WinstonModule } from "@modules/winston"
import { MixinModule } from "@modules/mixin"
import { KeypairsModule, UtilsModule } from "@modules/blockchains"
import { CryptoModule } from "@modules/crypto"
import { CodeModule } from "@modules/code"

@Module({
    imports: [
        // Load environment variables
        EnvModule.forRoot(),
        // Shared mixins/utilities
        MixinModule.register({
            isGlobal: true,
        }),
        // Code generator modules
        CodeModule.register({
            isGlobal: true,
        }),
        // Authentication modules (Passport + JWT)
        JwtModule.register({
            global: true,
        }),
        PassportModule.register({
            isGlobal: true,
        }),
        // Logger (Winston)
        WinstonModule.register({
            appName: "core",
            level: WinstonLevel.Info,
            isGlobal: true,
        }),
        // Database (Mongoose)
        MongooseModule.register({
            isGlobal: true,
        }),
        // Caching (Redis / Memory)
        CacheModule.register({
            isGlobal: true,
        }),
        // Crypto modules
        CryptoModule.register({
            isGlobal: true,
        }),
        // Blockchain-related modules
        UtilsModule.register({
            isGlobal: true,
        }),
        KeypairsModule.register({
            isGlobal: true,
        }),
        // HTTP API layer
        HttpModule.register({
            isGlobal: true,
        }),
    ],
})
export class AppModule {}