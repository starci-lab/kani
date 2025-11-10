import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./memdb.module-definition"
import { MemDbService } from "./memdb.service"
import { MemDbQueryService } from "./memdb-query.service"

@Module({
    providers: [MemDbService, MemDbQueryService],
    exports: [MemDbService, MemDbQueryService],
})
export class MemDbModule extends ConfigurableModuleClass {}
