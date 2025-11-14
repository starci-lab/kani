import { DynamicModule, Module } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./processors.module-definition"
import { PositionsModule } from "./positions"
@Module({})
export class ProcessorsModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        return {
            ...dynamicModule,
            imports: [
                ...dynamicModule.imports || [],
                PositionsModule.register({
                    isGlobal: true,
                }),
            ],
            providers: [
                ...dynamicModule.providers || [], 
            ],
            exports: [],
        }
    }
}   