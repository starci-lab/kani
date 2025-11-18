import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./math.module-definition"
import { TickMathService } from "./tick.service"
import { ZapMathService } from "./zap.service"
import { PoolMathService } from "./pool.service"
import { EnsureMathService } from "./ensure.service"

@Module({
    providers: [
        TickMathService,
        ZapMathService,
        PoolMathService,
        EnsureMathService,
    ],
    exports: [
        TickMathService,
        ZapMathService,
        PoolMathService,
        EnsureMathService,
    ],
})
export class MathModule extends ConfigurableModuleClass {}
