import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./user2.module-definition"
import { UserService } from "./user2.service"
import { UserResolver } from "./user2.resolver"

@Module({
    providers: [
        UserService,
        UserResolver,
    ],
})
export class UserModule extends ConfigurableModuleClass {}

