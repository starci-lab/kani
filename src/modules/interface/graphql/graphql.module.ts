import {
    DynamicModule, Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./graphql.module-definition"
import {
    QueriesModule 
} from "./queries"
import {
    MutationsModule 
} from "./mutations"

@Module({
})
export class GraphQLModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE) {
        // register the module
        const dynamicModule = super.register(options)
        const imports: Array<DynamicModule> = []
        // register apollo graphql module
        imports.push(
            QueriesModule.register(options),
            MutationsModule.register(options),
        )
        return {
            ...dynamicModule,
            imports,
            providers: [...dynamicModule.providers || []],
        }
    }
}