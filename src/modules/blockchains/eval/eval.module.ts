import {
    DynamicModule, Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./eval.module-definition"   
import {
    EvalBalanceService 
} from "./balace.service"
import {
    Provider 
} from "@nestjs/common"
import {
    EvalSnapshotService 
} from "./snapshots.service"

@Module({
})
export class EvalModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [
            EvalBalanceService,
            EvalSnapshotService,
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