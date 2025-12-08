import { Module } from "@nestjs/common" 
import { ConfigurableModuleClass } from "./ora.module-definition"
import { OraService } from "./ora.service"
import { OraOpenTransactionService } from "./open-transaction.service"
import { OraClosePositionService } from "./close-position.service"
import { OraOpenPositionService } from "./open-position.service"

@Module({
    providers: [
        OraService,
        OraOpenTransactionService,
        OraClosePositionService,
        OraOpenPositionService
    ],
    exports: [
        OraOpenTransactionService, 
        OraClosePositionService,
        OraOpenPositionService
    ],
})
export class OraModule extends ConfigurableModuleClass {}
