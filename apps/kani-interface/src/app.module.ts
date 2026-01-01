import { Module } from "@nestjs/common"
import { envConfig, EnvModule } from "@modules/env"
import { WinstonLevel, WinstonModule } from "@modules/winston"
import { MixinModule } from "@modules/mixin"
import { PrimaryMongoDbModule } from "@modules/databases"
import { HttpModule } from "@modules/interfaces/http"
import { PassportModule } from "@modules/passport"
import { FormulasModule, KeypairsModule, MathModule, PythModule, SpotModule } from "@modules/blockchains"
import { CryptoModule } from "@modules/crypto"
import { GcpModule } from "@modules/gcp"
import { CodeModule } from "@modules/code"
import { TotpModule } from "@modules/totp"
import { CacheModule } from "@modules/cache"
import { GraphQLModule } from "@modules/interfaces"
import { ThrottlerModule } from "@modules/throttler"
import { CookieModule } from "@modules/cookie"
import { SentryCatchAllExceptionFilter, SentryModule } from "@modules/sentry"
import { MailModule } from "@modules/mail"
import { SocketIoModule } from "@modules/interfaces"
import { ScheduleModule } from "@nestjs/schedule"
import { DependencyName, TerminusModule } from "@modules/terminus"
import { FilesystemModule } from "@modules/filesystem"
import { IoRedisModule } from "@modules/native"
import { SOCKETIO_ADAPTER_KEY } from "@modules/socketio"
import { APP_FILTER } from "@nestjs/core"
import { SealedModule } from "@modules/sealed"

@Module({
    imports: [
        EnvModule.forRoot(),
        FilesystemModule.register({
            isGlobal: true,
        }),
        IoRedisModule.register({
            isGlobal: true,
            additionalInstanceKeys: [SOCKETIO_ADAPTER_KEY],
            host: envConfig().redis.adapter.host,
            port: envConfig().redis.adapter.port,
            password: envConfig().redis.adapter.password,
            useCluster: envConfig().redis.adapter.useCluster,
        }),
        FormulasModule.register({
            isGlobal: true,
        }),
        SpotModule.register({
            isGlobal: true,
        }),
        WinstonModule.register({
            isGlobal: true,
            appName: "kani-interface",
            level: WinstonLevel.Info,
        }),
        SentryModule.register({
            isGlobal: true,
        }),
        PassportModule.register({
            isGlobal: true,
        }),
        CryptoModule.register({
            isGlobal: true,
        }),
        MathModule.register({
            isGlobal: true,
        }),
        CookieModule.register({
            isGlobal: true,
        }),
        SentryModule.register({
            isGlobal: true,
        }),
        SealedModule.register({
            isGlobal: true,
        }),
        ThrottlerModule.register({
            isGlobal: true,
        }),
        CodeModule.register({
            isGlobal: true,
        }),
        TotpModule.register({
            isGlobal: true,
            appName: "Kani",
        }),
        CacheModule.register({
            isGlobal: true,
        }),
        GcpModule.register({
            isGlobal: true,
        }),
        KeypairsModule.register({
            isGlobal: true,
        }),
        MixinModule.register({
            isGlobal: true,
        }),
        ScheduleModule.forRoot(),
        MailModule.register({
            isGlobal: true,
        }),
        PrimaryMongoDbModule.register({
            isGlobal: true,
            memoryStorage: true,
            withSeeders: true,
        }),
        PythModule.register({
            isGlobal: true,
            utilitiesOnly: true,
        }),
        HttpModule.register({
            isGlobal: true,
        }),
        SocketIoModule.register({
            isGlobal: true,
        }),
        GraphQLModule.register({
            isGlobal: true,
            useFederation: false,
            registerAllResolvers: true,
        }),
        TerminusModule.register({
            isGlobal: true,
            dependencies: [
                DependencyName.Disk,
                DependencyName.Memory,
                DependencyName.Kafka,
                DependencyName.MongodbPrimary,
                DependencyName.CacheRedis,
                DependencyName.AdapterRedis,
                DependencyName.ThrottlerRedis,
            ],
        }),
    ],
    providers: [
        {
            provide: APP_FILTER,
            useClass: SentryCatchAllExceptionFilter,
        },
    ]
})
export class AppModule { }
