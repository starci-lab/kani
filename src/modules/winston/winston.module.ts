import {
    DynamicModule, Module, Provider 
} from "@nestjs/common"
import {
    OPTIONS_TYPE, ConfigurableModuleClass 
} from "./winston.module-definition"
import {
    createConsoleWinstonProvider, createLokiWinstonProvider 
} from "./winston.providers"

@Module({
})
export class WinstonModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [
            createConsoleWinstonProvider(),
            createLokiWinstonProvider(),
        ]
        return {
            ...dynamicModule,
            providers: [...dynamicModule.providers || [],
                ...providers],
            exports: [...providers],
        }
    }
}   