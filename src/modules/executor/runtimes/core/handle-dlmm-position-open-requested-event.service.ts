import {
    DlmmPositionOpenRequestedEventPayload 
} from "@modules/event"
import {
    Injectable 
} from "@nestjs/common"

@Injectable()
export class HandleDlmmPositionOpenRequestedEventService {
    constructor(
    ) {}

    process(
        event: DlmmPositionOpenRequestedEventPayload,
    ) {
        console.log(event)
    }
}