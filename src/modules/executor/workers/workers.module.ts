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
@Module({
    imports: [
        ReconcileBalanceModule,
        OpenPositionModule,
    ],
})
export class WorkersModule extends ConfigurableModuleClass {}