import {
    Module,
} from "@nestjs/common"
import {
    ConfigurableModuleClass,
    OPTIONS_TYPE,
} from "./monolithic-apollo-server.module-definition"
import {
    GraphQLJSON,
} from "graphql-type-json"
import {
    ApolloDriver,
} from "@nestjs/apollo"
import {
    ApolloDriverConfig,
} from "@nestjs/apollo"
import {
    GraphQLModule,
} from "@nestjs/graphql"
import {
    ApolloServerPluginLandingPageLocalDefault,
} from "@apollo/server/plugin/landingPage/default"

@Module({
})
export class MonolithicApolloServerModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE) {
        const dynamicModule = super.register(options)
        return {
            ...dynamicModule,
            imports: [
                GraphQLModule.forRoot<ApolloDriverConfig>({
                    driver: ApolloDriver,
                    playground: false,
                    autoSchemaFile: true,
                    plugins: [ApolloServerPluginLandingPageLocalDefault()],
                    resolvers: {
                        JSON: GraphQLJSON,
                    },
                    context: ({ req, res }) => ({
                        req,
                        res,
                    }),
                }),
            ],
        }
    }
}

