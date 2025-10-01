import { Module } from "@nestjs/common"
import {
    GoogleAuthStrategy,
    JwtAccessTokenStrategy,
    JwtAccessTokenOnlyVerifiedTOTPStrategy,
    JwtRefreshTokenStrategy,
} from "./strategies"
import { PassportModule as NestPassportModule } from "@nestjs/passport"
import { ConfigurableModuleClass } from "./passport.module-definition"
import { JwtModule } from "@nestjs/jwt"
import { JwtAuthService } from "./jwt/jwt-auth.service"

@Module({
    imports: [
        NestPassportModule.register({}), 
        JwtModule
    ],
    providers: [
        GoogleAuthStrategy,
        JwtAccessTokenStrategy,
        JwtAccessTokenOnlyVerifiedTOTPStrategy,
        JwtRefreshTokenStrategy,
        JwtAuthService,
    ],
    exports: [JwtAuthService],
})
export class PassportModule extends ConfigurableModuleClass {}
