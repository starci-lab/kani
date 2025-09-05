// app.module.ts
import { DynamicModule, Module } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./axios.module-definition"   
import { createAxiosProvider } from "./axios.providers"

@Module({})
export class AxiosModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const provider = createAxiosProvider()
        return {
            ...dynamicModule,
            module: AxiosModule,
            providers: [
                provider,
            ],
            exports: [
                provider,
            ],
        }
    }
}