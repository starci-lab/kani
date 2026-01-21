import {
    ClmmPositionOpenRequestedEventPayload 
} from "@modules/event"
import {
    Injectable 
} from "@nestjs/common"

@Injectable()
export class HandleClmmPositionOpenRequestedEventService {
    constructor(
    ) {}

    process(
        event: ClmmPositionOpenRequestedEventPayload,
    ) {
        console.log(event)
    }
}