import { Module } from "@nestjs/common"
import { ExecutorModule } from "@modules/executor"
import { WinstonLevel, WinstonModule } from "@modules/winston"
import { envConfig, EnvModule } from "@modules/env"
import { PrimaryMongoDbModule } from "@modules/databases"
import { MixinModule } from "@modules/mixin"
import { ScheduleModule } from "@nestjs/schedule"

@Module({
    imports: [
        EnvModule.forRoot(),
        WinstonModule.register({
            isGlobal: true,
            appName: `kani-executor-${envConfig().botExecutor.batchId}`,
            level: WinstonLevel.Info,
        }),
        MixinModule.register({
            isGlobal: true,
        }),
        PrimaryMongoDbModule.register({
            isGlobal: true,
            withSeeders: true,
            memoryStorage: true,
        }),
        ScheduleModule.forRoot(),
        ExecutorModule.register({
            isGlobal: true,
        }),
    ],
})
export class AppModule {}
