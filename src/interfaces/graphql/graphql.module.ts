import { DynamicModule, Module } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./graphql.module-definition"
import { GraphQLModule as NestGraphQLModule } from "@nestjs/graphql"
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo"
import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default"
import { GraphQLJSON } from "graphql-type-json"
import { QueriesModule } from "./queries"
import { MutationsModule } from "./mutations"

@Module({})
export class GraphQLModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE) {
        // register the module
        const dynamicModule = super.register(options)
        const {
            useFederation = false,
            registerAllResolvers = true,
        } = options
        const imports: Array<DynamicModule> = []
        // register apollo graphql module
        if (useFederation) {
            throw new Error("Federation is not supported yet")
        } else {
            imports.push( 
                NestGraphQLModule.forRoot<ApolloDriverConfig>({
                    driver: ApolloDriver,
                    playground: false,
                    autoSchemaFile: true,
                    plugins: [ApolloServerPluginLandingPageLocalDefault()],
                    resolvers: { JSON: GraphQLJSON },
                }),)
        }
        // register all resolvers
        if (registerAllResolvers) {
            imports.push(QueriesModule.register(options))
            imports.push(MutationsModule.register(options))
        }
        return {
            module: GraphQLModule,
            imports,
            providers: [...dynamicModule.providers || []],
        }
    }
}