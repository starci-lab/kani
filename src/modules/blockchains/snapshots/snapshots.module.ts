import { DynamicModule, Injectable, Provider } from "@nestjs/common"
import { BalanceSnapshotService } from "./balance.service"
import { OpenPositionSnapshotService } from "./open-position.service"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./snapshots.module-definition"
import { SwapTransactionSnapshotService } from "./swap-transaction.service"
import { ClosePositionSnapshotService } from "./close-position.service"

@Injectable()
export class SnapshotsModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [
            BalanceSnapshotService,
            OpenPositionSnapshotService,
            SwapTransactionSnapshotService,
            ClosePositionSnapshotService,
        ]
        return {
            ...dynamicModule,
            providers: [
                ...dynamicModule.providers || [],
                ...providers,
            ],
            exports: [
                ...providers,
            ],
        }
    }
}


