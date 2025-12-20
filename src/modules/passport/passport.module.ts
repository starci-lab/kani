import { Module } from "@nestjs/common"
import {
    JwtAccessTokenStrategy,
    JwtAccessTokenOnlyMFAEnabledStrategy,
    JwtRefreshTokenStrategy,
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
        JwtAccessTokenStrategy,
        JwtAccessTokenOnlyMFAEnabledStrategy,
        JwtRefreshTokenStrategy,
        JwtAuthService,
    ],
    exports: [JwtAuthService],
})
export class PassportModule extends ConfigurableModuleClass {}
