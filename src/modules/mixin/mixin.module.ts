import {
    DynamicModule,
    Module,
    Provider
} from "@nestjs/common"
import {
    ConfigurableModuleClass
} from "./mixin.module-definition"
import type {
    MixinOptions
} from "./types"
import {
    RetryService
} from "./retry.service"
import {
    WaitService
} from "./wait.service"
import {
    NextJsQueryService
} from "./nextjs-query.service"
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

/**
 * Module for the Mixin service.
 */
@Module({
})
export class MixinModule extends ConfigurableModuleClass {
    /**
     * Register the Mixin module.
     * @param options - The options for the Mixin module.
     * @returns The DynamicModule for the Mixin module.
     */
    static register(options: MixinOptions): DynamicModule {
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
            providers: [
                ...(dynamicModule.providers ?? []),
                ...providers,
            ],
            exports: [...providers],
        }
    }
}