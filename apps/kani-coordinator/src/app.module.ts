import { Module } from "@nestjs/common"
import { APP_FILTER } from "@nestjs/core"
import { EnvModule } from "@modules/env"
import { WinstonLevel, WinstonModule } from "@modules/winston"
import { CoordinatorModule } from "@modules/coordinator"
import { PrimaryMongoDbModule } from "@modules/databases"
import { MixinModule } from "@modules/mixin"
import { SemaModule } from "@modules/lock"
import { EventEmitterModule } from "@nestjs/event-emitter"
import { KubernetesModule } from "@modules/kubernetes"
import { DependencyName, TerminusModule } from "@modules/terminus"
import { SentryCatchAllExceptionFilter, SentryModule } from "@modules/sentry"
import { StreamAsyncIteratorModule } from "@modules/stream-async-iterator"
import { ScheduleModule } from "@nestjs/schedule"

@Module({
    imports: [
        EnvModule.forRoot(),
        SentryModule.register({
            isGlobal: true,
        }),
        EventEmitterModule.forRoot(),
        WinstonModule.register({
            isGlobal: true,
            appName: "kani-coordinator",
            level: WinstonLevel.Verbose,
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
        PrimaryMongoDbModule.register({
            isGlobal: true,
            withSeeders: true,
            memoryStorage: true,
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
