import { Module } from "@nestjs/common"
import { UserModule } from "./user"
import { ConfigurableModuleClass } from "./api.module-definition"

@Module({
    imports: [UserModule],
})
export class ApiModule extends ConfigurableModuleClass {}