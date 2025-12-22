import { Module } from "@nestjs/common"
import { EnvModule } from "@modules/env"
import { WinstonLevel, WinstonModule } from "@modules/winston"
import { CoordinatorModule } from "@modules/coordinator"
import { PrimaryMongoDbModule } from "@modules/databases"
import { MixinModule } from "@modules/mixin"
import { EventEmitterModule } from "@nestjs/event-emitter"
import { KubernetesModule } from "@modules/kubernetes"
import { DependencyName, TerminusModule } from "@modules/terminus"

@Module({
    imports: [
        EnvModule.forRoot(),
        EventEmitterModule.forRoot(),
        WinstonModule.register({
            isGlobal: true,
            appName: "kani-coordinator",
            level: WinstonLevel.Verbose,
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
        CoordinatorModule.register({
            isGlobal: true,
        }),
    ],
})
export class AppModule {}
