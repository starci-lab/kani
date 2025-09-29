import { DynamicModule, Module } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./ioredis.module-definition"
import { createIoRedisProvider } from "./ioredis.providers"

@Module({})
export class IoRedisModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options)
        const { additionalInstanceKeys } = options
        const providers = [
            createIoRedisProvider(),
            ...(additionalInstanceKeys?.map(key => createIoRedisProvider(key)) || []),
        ]
        return {
            ...dynamicModule,
            providers: [
                ...(dynamicModule.providers || []),
                ...providers,
            ],
            exports: [
                ...providers,
            ],
        }
    }
}