import { DynamicModule, Module, Provider } from "@nestjs/common"
import { LockService } from "./lock.service"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./mixin.module-definition"
import { RetryService } from "./retry.service"
import { DayjsService } from "./dayjs.service"
import { NextJsQueryService } from "./nextjs-query.serivce"

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
        ]
        if (options.loadNextJsQueryService) {
            providers.push(NextJsQueryService)
        }       
        return {
            ...dynamicModule,
            providers,
            exports: [...providers],
        }
    }
}