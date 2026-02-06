import {
    DynamicModule,
    Module,
} from "@nestjs/common"
import {
    ConfigurableModuleClass,
    OPTIONS_TYPE,
} from "./apollo-server.module-definition"
import {
    ApolloServerType,
} from "./enums"
import {
    MonolithicApolloServerModule,
} from "./monolithic"
import {
    FederationApolloServerModule,
} from "./federation"
import {
    ServicesModule,
} from "./services"

/**
 * Nest module that registers Apollo Server (monolithic or federation) and optional services.
 *
 * @example
 * ApolloServerModule.register({ type: ApolloServerType.Monolithic, useServices: true })
 */
@Module({
})
export class ApolloServerModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options)
        const modules: Array<DynamicModule> = []

        // add server module by type
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
                ...(dynamicModule.providers ?? []),
            ],
            imports: [...modules],
            exports: [...modules],
        }
    }
}