// app.module.ts
import {
    DynamicModule, Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./apollo-server.module-defination"
import {
    ApolloServerType 
} from "./types"
import {
    MonolithicApolloServerModule 
} from "./monolithic"
import {
    FederationApolloServerModule 
} from "./federation"
import {
    ServicesModule 
} from "./services"

@Module({
})
export class ApolloServerModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const modules: Array<DynamicModule> = []
        switch (options.type) {
        case ApolloServerType.Monolithic:
            modules.push(MonolithicApolloServerModule.register(options))
            break
        case ApolloServerType.Federation:
            modules.push(FederationApolloServerModule.register(options))
            break
        }
        if (options.useServices) {
            modules.push(ServicesModule.register(options))
        }
        return {
            ...dynamicModule,
            providers: [
                ...dynamicModule.providers || [],
            ],
            imports: [
                ...modules,
            ],
            exports: [
                ...modules,
            ],
        }
    }
}