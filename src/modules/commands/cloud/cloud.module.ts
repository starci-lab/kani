
import { Module } from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE
} from "./cloud.module-definition"
import { DatabaseModule } from "./database"
import { envConfig } from "@modules/env"
@Module({})
export class CloudModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE = {}) {
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
