import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./users.module-definition"
import { UserModule } from "./user"
import { TotpSecretModule } from "./totp-secret"
import { UserV2Module } from "./user-v2"

@Module({
    imports: [
        UserModule.register({}),
        TotpSecretModule.register({}),
        UserV2Module.register({}),
    ],
})
export class UsersModule extends ConfigurableModuleClass {}