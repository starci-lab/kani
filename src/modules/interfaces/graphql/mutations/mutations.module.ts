import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./mutations.module-definition"
import { AuthModule } from "./auth"
import { BotModule } from "./bot"

@Module({
    imports: [
        AuthModule.register({
            isGlobal: true,
        }),
        BotModule.register({
            isGlobal: true,
        }),
    ],
})
export class MutationsModule extends ConfigurableModuleClass {}