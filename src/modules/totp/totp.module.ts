import {
    DynamicModule,
    Module 
} from "@nestjs/common"
import {
    PassportModule as NestPassportModule 
} from "@nestjs/passport"
import {
    ConfigurableModuleClass, 
    OPTIONS_TYPE
} from "./totp.module-definition"
import {
    JwtModule 
} from "@nestjs/jwt"
import {
    TotpService 
} from "./totp.service"

/**
 * The module for the TOTP.
 */
@Module({
    imports: [
        NestPassportModule, 
        JwtModule
    ],
    providers: [
        TotpService,
    ],
    exports: [TotpService],
})
export class TotpModule extends ConfigurableModuleClass {
    /**
     * Register the TOTP module.
     * @param options - The options for the TOTP module.
     * @returns The DynamicModule for the TOTP module.
     */
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        return super.register(options)
    }
}
