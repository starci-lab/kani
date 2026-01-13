import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./transactions2-v2.module-definition"
import { Transactions2V2Service } from "./transactions2-v2.service"
import { Transactions2V2Resolver } from "./transactions2-v2.resolver"

@Module({
    providers: [
        Transactions2V2Service,
        Transactions2V2Resolver,
    ],
})
export class Transactions2V2Module extends ConfigurableModuleClass {}

