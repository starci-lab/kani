import {
    Module 
} from "@nestjs/common"
import {
    EventEmitterModule 
} from "@nestjs/event-emitter"
import {
    WinstonModule 
} from "@modules/winston"
import {
    WinstonLevel 
} from "@modules/winston"
import {
    MixinModule 
} from "@modules/mixin"
import {
    envConfig,
    EnvModule 
} from "@modules/env"
import {
    FilesystemModule 
} from "@modules/filesystem"
import {
    SentryModule 
} from "@modules/sentry"
import {
    PrimaryMongoDbModule 
} from "@modules/databases"
import {
    CacheModule 
} from "@modules/cache"
import {
    ServiceName 
} from "@modules/common"
import {
    RedisInstanceKey, RedisModule 
} from "@modules/native"
import {
    StreamAsyncIteratorModule 
} from "@modules/stream-async-iterator"
import {
    EventModule 
} from "@modules/event"
import {
    DependencyName, TerminusModule 
} from "@modules/terminus"
import {
    ScheduleModule 
} from "@nestjs/schedule"
import {
    InspectorModule 
} from "@features/inspector"
import {
    CexesModule 
} from "@modules/blockchains"

@Module({
    imports: [
        EnvModule.forRoot(),
        FilesystemModule.register({
            isGlobal: true,
        }),
        StreamAsyncIteratorModule.register(
            {
                isGlobal: true,
            }
        ),
        SentryModule.register({
            isGlobal: true,
        }),
        ScheduleModule.forRoot(),
        WinstonModule.register(
            {
                isGlobal: true,
                serviceName: ServiceName.KaniInspector,
                level: envConfig().winston.level as WinstonLevel,
            }
        ),
        EventEmitterModule.forRoot(),
        EventModule.register({
            isGlobal: true,
            kafka: {
                createTopicsIfNotExists: true,
                groupId: ServiceName.KaniInspector,
            },
        }),
        MixinModule.register({
            isGlobal: true,
        }),
        RedisModule.register({
            isGlobal: true,
            instanceKeys: [
                RedisInstanceKey.Cache,
            ],
        }),
        CacheModule.register({
            isGlobal: true,
        }),
        PrimaryMongoDbModule.register({
            isGlobal: true,
            memoryStorage: {
                manualLoad: envConfig().databases.mongoose.primary.manualLoad,
            },
            withSeeders: {
                manualSeed: envConfig().databases.mongoose.primary.manualSeed,
            },
            associate: envConfig().databases.mongoose.primary.associate,
        }),
        TerminusModule.register({
            isGlobal: true,
            dependencies: [
                DependencyName.MongodbPrimary,
                DependencyName.CacheRedis,
            ],
        }),
        CexesModule.register(
            {
                isGlobal: true,
                useKafka: false,
                useLocal: true,
                updateCache: false,
            }
        ),
        InspectorModule.register({
            isGlobal: true,
        }),
    ],
    controllers: [],
    providers: [],
})
export class AppModule {}
