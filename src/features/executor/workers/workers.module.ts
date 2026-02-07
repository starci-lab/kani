import {
    Module,
} from "@nestjs/common"
import {
    ReconcileBalanceModule,
} from "./reconcile-balance"
import {
    ConfigurableModuleClass,
} from "./workers.module-definition"
import {
    OpenPositionModule,
} from "./open-position"
import {
    ClosePositionModule,
} from "./close-position"
import {
    WithdrawModule,
} from "./withdraw"
import {
    CommonModule 
} from "./common"
@Module({
    imports: [
        CommonModule.register(
            {
                isGlobal: true,
            }
        ),
        ReconcileBalanceModule.register(
            {
                isGlobal: true,
            }
        ),
        OpenPositionModule.register(
            {
                isGlobal: true,
            }
        ),
        ClosePositionModule.register(
            {
                isGlobal: true,
            }
        ),
        WithdrawModule.register(
            {
                isGlobal: true,
            }
        ),
    ],
})
export class WorkersModule extends ConfigurableModuleClass {}