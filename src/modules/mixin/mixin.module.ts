import {
    DynamicModule, Module, Provider 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./mixin.module-definition"
import {
    RetryService 
} from "./retry.service"
import {
    WaitService 
} from "./wait.service"
import {
    NextJsQueryService 
} from "./nextjs-query.serivce"
import {
    ReadinessWatcherFactoryService 
} from "./readiness-watcher-factory.service"
import {
    InstanceIdService 
} from "./instance-id.service"
import {
    createSuperJsonServiceProvider 
} from "./superjson.providers"
import {
    AsyncService 
} from "./async.service"
import {
    DayjsService 
} from "./dayjs.service"
import {
    createFakerServiceProvider 
} from "./faker.providers"
import {
    LokiJSService 
} from "./lokijs.service"

@Module({
})
export class MixinModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [
            RetryService,
            WaitService,
            ReadinessWatcherFactoryService,
            InstanceIdService,
            DayjsService,
            createSuperJsonServiceProvider(),
            createFakerServiceProvider(),
            AsyncService,
            LokiJSService,
        ]
        if (options.loadNextJsQueryService) {
            providers.push(NextJsQueryService)
        }
        return {
            ...dynamicModule,
            providers: [...dynamicModule.providers || [],
                ...providers],
            exports: [...providers],
        }
    }
}