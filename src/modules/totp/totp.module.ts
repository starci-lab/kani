import { Module } from "@nestjs/common"
import { PassportModule as NestPassportModule } from "@nestjs/passport"
import { ConfigurableModuleClass } from "./totp.module-definition"
import { JwtModule } from "@nestjs/jwt"
import { TotpService } from "./totp.service"

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
export class TotpModule extends ConfigurableModuleClass {}
