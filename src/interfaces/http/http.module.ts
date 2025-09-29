import { Module } from "@nestjs/common"
import { AuthModule } from "./auth"
import { ConfigurableModuleClass } from "./http.module-definition"

@Module({
    imports: [AuthModule],
})
export class HttpModule extends ConfigurableModuleClass {}