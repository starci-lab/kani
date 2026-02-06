import {
    Module
} from "@nestjs/common"
import {
    ConfigModule 
} from "@nestjs/config"
import {
    envConfig 
} from "./config"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./env.module-definition"

/**
 * Module for loading environment variables from .env files.
 * @example
 * EnvModule.forRoot()
 */
@Module({
})
export class EnvModule extends ConfigurableModuleClass {
    /**
     * Loads environment variables from .env files.
     * @param options - Optional options for the module.
     * @returns A dynamic module that imports the ConfigModule and exports the envConfig.
     */
    static forRoot(options: typeof OPTIONS_TYPE = {
    }) {
        const dynamicModule = super.forRoot(options)
        return {
            ...dynamicModule,
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    //skipProcessEnv: true,
                    load: [envConfig],
                    envFilePath: [
                        ".env.local", 
                        ".env.secret",
                        ".env.override"
                    ]
                })
            ]
        }
    }
}