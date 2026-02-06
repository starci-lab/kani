import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./users.module-definition"
import {
    UserModule 
} from "./user"
import {
    TotpSecretModule 
} from "./totp-secret"
import {
    TotpSecretV2Module 
} from "./totp-secret-v2"
import {
    UserV2Module 
} from "./user-v2"

@Module({
    imports: [
        UserModule.register({
            isGlobal: true,
        }),
        TotpSecretModule.register({
            isGlobal: true,
        }),
        TotpSecretV2Module.register({
            isGlobal: true,
        }),
        UserV2Module.register({
            isGlobal: true,
        }),
    ],
})
export class UsersModule extends ConfigurableModuleClass {}