import {
    DynamicModule, Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./rotation.module-definition"
import {
    RotationService 
} from "./rotation.service"
@Module({
})
export class RotationModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        return {
            ...dynamicModule,
            providers: [
                ...dynamicModule.providers || [], 
                RotationService
            ],
            exports: [
                RotationService,
            ],
        }
    }
}   