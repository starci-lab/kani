import { DynamicModule, Injectable, Provider } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./momentum.module-definition"
import { MomentumObserverService } from "./observer.service"

@Injectable()
export class MomentumModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [
            MomentumObserverService
        ]
        return {
            ...dynamicModule,
            providers: [
                ...dynamicModule.providers || [],
                ...providers,
            ],
            exports: [
                ...providers,
            ],
        }
    }
}
