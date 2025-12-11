import { Module } from "@nestjs/common"
import {
    GoogleAuthStrategy,
    JwtAccessTokenStrategy,
    JwtAccessTokenOnlyVerifiedTOTPStrategy,
    JwtRefreshTokenStrategy,
    PrivyAuthTokenStrategy
} from "./strategies"
import { PassportModule as NestPassportModule } from "@nestjs/passport"
import { ConfigurableModuleClass } from "./passport.module-definition"
import { JwtModule } from "@nestjs/jwt"
import { JwtAuthService } from "./jwt"

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
        PrivyAuthTokenStrategy,
    ],
    exports: [JwtAuthService],
})
export class PassportModule extends ConfigurableModuleClass {}
