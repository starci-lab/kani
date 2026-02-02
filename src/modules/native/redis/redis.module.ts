import {
    DynamicModule, Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./redis.module-definition"
import {
    createRedisProvider 
} from "./redis.providers"

@Module({
})
export class RedisModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options)
        const { instanceKeys } = options
        const providers = instanceKeys.map(instanceKey =>
            createRedisProvider(instanceKey)
        )
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
