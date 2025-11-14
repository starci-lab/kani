import { DynamicModule, Module } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./positions.module-definition"
import { OpenPositionProcessorService } from "./open-position.service"
@Module({})
export class PositionsModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        return {
            ...dynamicModule,
            providers: [
                ...dynamicModule.providers || [], 
                OpenPositionProcessorService,
            ],
            exports: [],
        }
    }
}   