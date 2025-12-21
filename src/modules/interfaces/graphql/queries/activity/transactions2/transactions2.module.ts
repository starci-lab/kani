import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./transactions2.module-definition"
import { Transactions2Service } from "./transactions2.service"
import { Transactions2Resolver } from "./transactions2.resolver"

@Module({
    providers: [
        Transactions2Service,
        Transactions2Resolver,
    ],
})
export class Transactions2Module extends ConfigurableModuleClass {}

