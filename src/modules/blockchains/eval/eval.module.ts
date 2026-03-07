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
import {
    FilesystemModule 
} from "@modules/filesystem"

/**
 * Eval module.
 * Provides services for evaluating bot balance and snapshot eligibility.
 *
 * @example
 * EvalModule.register({ isGlobal: false })
 */
@Module({
})
export class EvalModule extends ConfigurableModuleClass {
    /**
     * Registers the Eval module with the specified options.
     *
     * @param options - Module configuration options
     * @returns Dynamic module configuration
     */
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
            imports: [
                ...(dynamicModule.imports || []),
                FilesystemModule,
            ],
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