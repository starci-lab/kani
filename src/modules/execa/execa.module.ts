import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./execa.module-definition"
import { ExecaService } from "./execa.service"

@Module({
    providers: [
        ExecaService,
    ],
    exports: [ExecaService],
})
export class ExecaModule extends ConfigurableModuleClass {}