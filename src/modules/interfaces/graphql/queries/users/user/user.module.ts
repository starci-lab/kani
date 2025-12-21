import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./user.module-definition"
import { UserService } from "./user.service"
import { UserResolver } from "./user.resolver"

@Module({
    providers: [
        UserService,
        UserResolver,
    ],
})
export class UserModule extends ConfigurableModuleClass {}

