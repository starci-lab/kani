import {
    DynamicModule,
    Module,
    Provider,
} from "@nestjs/common"
import {
    ConfigurableModuleClass,
    OPTIONS_TYPE 
} from "./graph.module-definition"
import {
    BipartiteMatchingService 
} from "./bipartite-matching"

/**
 * Graph Module
 * 
 * Provides Graph services.
 * 
 * @example
 * GraphModule.register({
 *   isGlobal: true,
 * })
 */
@Module({
})
export class GraphModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [
            BipartiteMatchingService,
        ]
        return {
            ...dynamicModule,
            providers: [...dynamicModule.providers || [],
                ...providers],
            exports: [...providers],
        }
    }
}