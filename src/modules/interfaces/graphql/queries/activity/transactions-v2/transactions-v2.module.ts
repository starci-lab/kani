import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./transactions-v2.module-definition"
import { TransactionsV2Service } from "./transactions-v2.service"
import { TransactionsV2Resolver } from "./transactions-v2.resolver"

@Module({
    providers: [
        TransactionsV2Service,
        TransactionsV2Resolver,
    ],
})
export class TransactionsV2Module extends ConfigurableModuleClass {}

