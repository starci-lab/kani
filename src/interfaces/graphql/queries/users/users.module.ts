import { Module } from "@nestjs/common"
import { UsersResolver } from "./users.resolver"
import { UsersService } from "./users.service"
import { ConfigurableModuleClass } from "./users.module-definition"

@Module({
    providers: [UsersResolver, UsersService],
})
export class UsersModule extends ConfigurableModuleClass {}