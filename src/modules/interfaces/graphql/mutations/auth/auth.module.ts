import { Module } from "@nestjs/common"
import { AuthResolvers } from "./auth.resolvers"
import { AuthService } from "./auth.service"
import { ConfigurableModuleClass } from "./auth.module-definition"
import { AuthPrivyResolvers } from "./auth-privy.resolvers"
import { AuthPrivyService } from "./auth-privy.service"

@Module({
    providers: [
        AuthResolvers, 
        AuthService, 
        AuthPrivyResolvers, 
        AuthPrivyService
    ],
})
export class AuthModule extends ConfigurableModuleClass {}