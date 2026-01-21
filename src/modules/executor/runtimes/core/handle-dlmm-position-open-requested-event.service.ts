import {
    DlmmPositionOpenRequestedEventPayload 
} from "@modules/event"
import {
    Injectable 
} from "@nestjs/common"
import {
    BotSchema 
} from "@modules/databases"

@Injectable()
export class HandleDlmmPositionOpenRequestedEventService {
    constructor(
    ) {}

    process(
        bot: BotSchema,
        event: DlmmPositionOpenRequestedEventPayload,
    ) {
        console.log(event)
    }
}