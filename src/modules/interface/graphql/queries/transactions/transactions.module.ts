import {
    Module,
} from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./transactions.module-definition"
import {
    TransactionsV1Module,
} from "./transactions"
import {
    TransactionsV2Module,
} from "./transactions-v2"

@Module({
    imports: [
        TransactionsV1Module.register({
            isGlobal: true,
        }),
        TransactionsV2Module.register({
            isGlobal: true,
        }),
    ],
})
export class TransactionsModule extends ConfigurableModuleClass {}


