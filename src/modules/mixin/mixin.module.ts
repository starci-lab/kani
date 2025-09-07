import { DynamicModule, Module, Provider } from "@nestjs/common"
import { LockService } from "./lock.service"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./mixin.module-definition"
import { RetryService } from "./retry.service"
import { DayjsService } from "./dayjs.service"
import { NextJsQueryService } from "./nextjs-query.serivce"
import { ReadinessWatcherFactoryService } from "./readiness-watcher-factory.service"
import { InstanceIdService } from "./instance-id.service"
import { RandomDelayService } from "./random-delay.service"

@Module({})
export class MixinModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [
            LockService,
            RetryService,
            DayjsService,
            ReadinessWatcherFactoryService,
            InstanceIdService,
            RandomDelayService
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