import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./memdb.module-definition"
import { MemDbService } from "./memdb.service"
import { MemDbTokenUtilsService } from "./memdb-token-utils.service"

@Module({
    providers: [MemDbService, MemDbTokenUtilsService],
    exports: [MemDbService, MemDbTokenUtilsService],
})
export class MemDbModule extends ConfigurableModuleClass {}
