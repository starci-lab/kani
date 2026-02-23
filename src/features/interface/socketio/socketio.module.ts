import {
    Module 
} from "@nestjs/common"
import {
    DynamicLiquidityPoolInfoModule
} from "./dynamic-liquidity-pool-info"
import {
    ConfigurableModuleClass 
} from "./socketio.module-definition"
import {
    PriceModule 
} from "./price"
import {
    CallbackModule 
} from "./callback"

@Module({
    imports: [
        DynamicLiquidityPoolInfoModule.register(
            {
                isGlobal: true,
            }
        ),
        PriceModule.register(
            {
                isGlobal: true,
            }
        ),
        CallbackModule.register(
            {
                isGlobal: true,
            }
        ),
    ],
})
export class SocketIoModule extends ConfigurableModuleClass {}