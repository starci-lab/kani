import {
    Module 
} from "@nestjs/common"
import {
    InspectorModule 
} from "@modules/inspector"
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

@Module({
    imports: [
        EnvModule.forRoot(),
        FilesystemModule.register({
            isGlobal: true,
        }),
        SentryModule.register({
            isGlobal: true,
        }),
        WinstonModule.register({
            isGlobal: true,
            serviceName: ServiceName.KaniObserver,
            level: envConfig().winston.level as WinstonLevel,
        }),
        EventEmitterModule.forRoot(),
        MixinModule.register({
            isGlobal: true,
        }),
        CacheModule.register({
            isGlobal: true,
        }),
        PrimaryMongoDbModule.register({
            isGlobal: true,
            memoryStorage: {
                manualLoad: false,
            },
            withSeeders: {
                manualSeed: true,
            },
            associate: true,
        }),
        InspectorModule.register({
            isGlobal: true,
        }),
    ],
    controllers: [],
    providers: [],
})
export class AppModule {}
