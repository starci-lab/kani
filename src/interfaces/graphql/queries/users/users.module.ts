import { Module } from "@nestjs/common"
import { UsersResolvers } from "./users.resolvers"
import { UsersService } from "./users.service"
import { ConfigurableModuleClass } from "./users.module-definition"

@Module({
    providers: [UsersResolvers, UsersService],
})
export class UsersModule extends ConfigurableModuleClass {}