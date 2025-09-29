import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./mutations.module-definition"
import { UsersModule } from "./users"

@Module({
    imports: [
        UsersModule.register({}),
    ],
})
export class QueriesModule extends ConfigurableModuleClass {}