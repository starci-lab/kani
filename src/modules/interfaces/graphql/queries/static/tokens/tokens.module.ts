import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./tokens.module-definition"
import { TokensService } from "./tokens.service"
import { TokensResolver } from "./tokens.resolver"

@Module({
    providers: [
        TokensService,
        TokensResolver,
    ],
})
export class TokensModule extends ConfigurableModuleClass {}

