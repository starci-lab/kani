import {
    Module,
} from "@nestjs/common"
import {
    ReconcileBalanceModule,
} from "./reconcile-balance"
import {
    ConfigurableModuleClass,
} from "./workers.module-definition"
@Module({
    imports: [
        ReconcileBalanceModule,
    ],
})
export class WorkersModule extends ConfigurableModuleClass {}