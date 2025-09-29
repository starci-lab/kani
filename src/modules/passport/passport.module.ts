import { Module } from "@nestjs/common"
import {
    GoogleAuthStrategy,
    JwtAccessTokenStrategy,
    JwtRefreshTokenStrategy,
    JwtTemporaryAccessTokenStrategy,
} from "./strategies"
import { PassportModule as NestPassportModule } from "@nestjs/passport"
import { ConfigurableModuleClass } from "./passport.module-definition"
import { JwtModule } from "@nestjs/jwt"
import { JwtAuthService } from "./jwt/jwt-auth.service"

@Module({
    imports: [
        NestPassportModule, 
        JwtModule
    ],
    providers: [
        GoogleAuthStrategy,
        JwtAccessTokenStrategy,
        JwtRefreshTokenStrategy,
        JwtTemporaryAccessTokenStrategy,
        JwtAuthService,
    ],
    exports: [JwtAuthService],
})
export class PassportModule extends ConfigurableModuleClass {}
