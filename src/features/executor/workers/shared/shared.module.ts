import {
    Module,
} from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./shared.module-definition"
import {
    OnFailedService 
} from "./actions"
import {
    SendHeartbeatService 
} from "./actions"
import {
    OnCompletedService,
    ClearService,
    SerializerService
} from "./actions"

/**
 * Shared module for the workers.
 */
@Module(
    {
        providers: [
            OnCompletedService,
            OnFailedService,
            SendHeartbeatService,
            ClearService,
            SerializerService,
        ],
        exports: [
            OnCompletedService,
            OnFailedService,
            SendHeartbeatService,
            ClearService,
            SerializerService,
        ],
    }
)
export class SharedModule extends ConfigurableModuleClass {}


