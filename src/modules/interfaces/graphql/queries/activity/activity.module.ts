import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./activity.module-definition"
import { TransactionsModule } from "./transactions"
import { PositionsModule } from "./positions"
import { Transactions2Module } from "./transactions2"
import { Positions2Module } from "./positions2"

@Module({
    imports: [
        TransactionsModule,
        PositionsModule,
        Transactions2Module,
        Positions2Module,
    ],
})
export class ActivityModule extends ConfigurableModuleClass {}