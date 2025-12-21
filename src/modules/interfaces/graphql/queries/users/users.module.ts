import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./users.module-definition"
import { UserModule } from "./user"
import { TotpSecretModule } from "./totp-secret"

@Module({
    imports: [
        UserModule.register({}),
        TotpSecretModule.register({}),
    ],
})
export class UsersModule extends ConfigurableModuleClass {}