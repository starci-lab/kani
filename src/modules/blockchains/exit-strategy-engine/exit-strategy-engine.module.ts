import { ExitStrategyEngineOutputService } from "./exit-strategy-engine-output.service"
import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./keypairs.module-definition"
import { OutOfRangeStrategyEngineService } from "./out-of-range-strategy-engine.service"    

@Module({
    providers: [OutOfRangeStrategyEngineService, ExitStrategyEngineOutputService],
    exports: [ExitStrategyEngineOutputService],
})
export class ExitStrategyEngineModule extends ConfigurableModuleClass {}
