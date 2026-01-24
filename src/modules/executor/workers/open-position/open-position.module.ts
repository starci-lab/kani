import {
    Module,
} from "@nestjs/common"
import {
    PrepareService,
} from "./prepare.service"
import {
    SendHeartbeatService,
} from "./send-heartbeat.service"
import {
    OnCompletedService,
} from "./on-completed.service"
import {
    OnFailedService,
} from "./on-failed.service"
import {
    OpenPositionWorker 
} from "./open-position.worker"
import {
    ExecuteService,
} from "./execute.service"

@Module({
    providers: [
        OpenPositionWorker,
        PrepareService,
        SendHeartbeatService,
        OnCompletedService,
        OnFailedService,
        ExecuteService,
    ],
})
export class OpenPositionModule {}