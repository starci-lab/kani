import { Module } from "@nestjs/common" 
import { ConfigurableModuleClass } from "./ora.module-definition"
import { OraService } from "./ora.service"
import { OraOpenTransactionService } from "./open-transaction.service"
import { OraClosePositionService } from "./close-position.service"

@Module({
    providers: [
        OraService,
        OraOpenTransactionService,
        OraClosePositionService,
    ],
    exports: [
        OraOpenTransactionService, 
        OraClosePositionService,
    ],
})
export class OraModule extends ConfigurableModuleClass {}
