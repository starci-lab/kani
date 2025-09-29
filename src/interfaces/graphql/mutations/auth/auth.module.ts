import { Module } from "@nestjs/common"
import { AuthResolvers } from "./auth.resolvers"
import { AuthService } from "./auth.service"
import { ConfigurableModuleClass } from "./auth.module-definition"

@Module({
    providers: [AuthResolvers, AuthService],
})
export class AuthModule extends ConfigurableModuleClass {}