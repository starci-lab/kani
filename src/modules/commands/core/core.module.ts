
import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE
} from "./core.module-definition"
import {
    DatabaseModule 
} from "./database"
import {
    envConfig 
} from "@modules/env"
@Module({
})
export class CoreModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE = {
    }) {
        const dynamicModule = super.register(options)
        const isProduction = envConfig().isProduction
        const modules = isProduction ? [] : [
            DatabaseModule.register({
                isGlobal: options.isGlobal,
            })
        ]
        return {
            ...dynamicModule,
            imports: [
                ...modules,
            ]
        }
    }
}
