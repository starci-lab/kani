import {
    Module 
} from "@nestjs/common"
import {
    APP_FILTER 
} from "@nestjs/core"
import {
    EnvModule,
    envConfig,
} from "@modules/env"
import {
    ServiceName,
} from "@modules/common"
import {
    WinstonLevel, WinstonModule 
} from "@modules/winston"
import {
    CoordinatorModule 
} from "@features/coordinator"
import {
    PrimaryMongoDbModule 
} from "@modules/databases"
import {
    MixinModule 
} from "@modules/mixin"
import {
    SemaModule 
} from "@modules/lock"
import {
    EventEmitterModule 
} from "@nestjs/event-emitter"
import {
    KubernetesModule 
} from "@modules/kubernetes"
import {
    DependencyName, TerminusModule 
} from "@modules/terminus"
import {
    SentryCatchAllExceptionFilter, SentryModule 
} from "@modules/sentry"
import {
    StreamAsyncIteratorModule 
} from "@modules/stream-async-iterator"
import {
    ScheduleModule 
} from "@nestjs/schedule"
import {
    EventModule 
} from "@modules/event"
import {
    CacheModule 
} from "@modules/cache"
import {
    RedisInstanceKey, RedisModule 
} from "@modules/native"

@Module({
    imports: [
        EnvModule.forRoot(),
        SentryModule.register({
            isGlobal: true,
        }),
        RedisModule.register({
            isGlobal: true,
            instanceKeys: [
                RedisInstanceKey.Cache,
            ],
        }),
        EventEmitterModule.forRoot(),
        EventModule.register({
            isGlobal: true,
            nats: {
                createStreamsIfNotExists: true,
                queueGroup: ServiceName.KaniCoordinator,
            },
        }),
        WinstonModule.register({
            isGlobal: true,
            serviceName: ServiceName.KaniCoordinator,
            level: envConfig().winston.level as WinstonLevel,
        }),
        ScheduleModule.forRoot(),
        StreamAsyncIteratorModule.register({
            isGlobal: true,
        }),
        TerminusModule.register({
            isGlobal: true,
            dependencies: [
                DependencyName.Disk,
                DependencyName.Memory,
                DependencyName.MongodbPrimary,
                DependencyName.CacheRedis,
                DependencyName.ThrottlerRedis,
            ],
        }),
        KubernetesModule.register({
            isGlobal: true,
        }),
        MixinModule.register({
            isGlobal: true,
        }),
        CacheModule.register({
            isGlobal: true,
        }),
        PrimaryMongoDbModule.register({
            isGlobal: true,
            withSeeders: {
                manualSeed: envConfig().databases.mongoose.primary.manualSeed,
            },
            memoryStorage: {
                manualLoad: envConfig().databases.mongoose.primary.manualLoad,
            },
            associate: envConfig().databases.mongoose.primary.associate,
        }),
        SemaModule.register({
            isGlobal: true,
        }),
        CoordinatorModule.register({
            isGlobal: true,
        }),
    ],
    providers: [
        {
            provide: APP_FILTER,
            useClass: SentryCatchAllExceptionFilter,
        },
    ],
})
export class AppModule {}
