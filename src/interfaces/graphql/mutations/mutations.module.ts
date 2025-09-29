import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./mutations.module-definition"
import { AuthModule } from "./auth"

@Module({
    imports: [
        AuthModule.register({}),
    ],
})
export class MutationsModule extends ConfigurableModuleClass {}