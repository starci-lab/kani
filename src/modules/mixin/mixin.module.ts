import { DynamicModule, Module, Provider } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./mixin.module-definition"
import { RetryService } from "./retry.service"
import { NextJsQueryService } from "./nextjs-query.serivce"
import { ReadinessWatcherFactoryService } from "./readiness-watcher-factory.service"
import { InstanceIdService } from "./instance-id.service"
import { RandomDelayService } from "./random-delay.service"
import { createSuperJsonServiceProvider } from "./superjson.providers"
import { AsyncService } from "./async.service"
import { MsService } from "./ms.service"
import { LoadBalancerService } from "./load-balancer.service"
import { DayjsService } from "./dayjs.service"

@Module({})
export class MixinModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [
            RetryService,
            ReadinessWatcherFactoryService,
            InstanceIdService,
            RandomDelayService,
            DayjsService,
            createSuperJsonServiceProvider(),
            AsyncService,
            MsService,
            LoadBalancerService
        ]
        if (options.loadNextJsQueryService) {
            providers.push(NextJsQueryService)
        }
        return {
            ...dynamicModule,
            providers: [...dynamicModule.providers || [], ...providers],
            exports: [...providers],
        }
    }
}