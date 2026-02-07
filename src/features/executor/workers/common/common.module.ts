import {
    Module,
} from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./common.module-definition"
import {
    OnFailedService 
} from "./on-failed.service"
import {
    SendHeartbeatService 
} from "./send-heartbeat.service"
import {
    OnCompletedService 
} from "./on-completed.service"
import {
    ClearService 
} from "./clear.service"
import {
    SerializerService 
} from "./serializer.service"

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
export class CommonModule extends ConfigurableModuleClass {}


