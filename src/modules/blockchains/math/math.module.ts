import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./math.module-definition"
import { TickMathService } from "./tick.service"
import { ZapMathService } from "./zap.service"
import { PoolMathService } from "./pool.service"

@Module({
    providers: [
        TickMathService,
        ZapMathService,
        PoolMathService,
    ],
    exports: [
        TickMathService,
        ZapMathService,
        PoolMathService,
    ],
})
export class MathModule extends ConfigurableModuleClass {}
