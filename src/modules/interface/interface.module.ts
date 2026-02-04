import {
    DynamicModule, Module, Provider 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./interface.module-definition"
import {
    HttpModule 
} from "./http"
import {
    GraphQLModule 
} from "./graphql"
import {
    SocketIoModule 
} from "./socketio"
@Module({
})
export class InterfaceModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = []
        return {
            imports: [
                HttpModule.register({
                    isGlobal: true,
                }),
                GraphQLModule.register({
                    isGlobal: true,
                }),
                SocketIoModule.register({
                    isGlobal: true,
                }),
            ],
            ...dynamicModule,
            providers: [...dynamicModule.providers || [],
                ...providers],
            exports: [...providers],
        }
    }
}   