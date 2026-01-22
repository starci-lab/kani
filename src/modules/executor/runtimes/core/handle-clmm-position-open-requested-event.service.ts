import {
    ClmmPositionOpenRequestedEventPayload 
} from "@modules/event"
import {
    Injectable 
} from "@nestjs/common"
import {
    BotSchema 
} from "@modules/databases"

@Injectable()
export class HandleClmmPositionOpenRequestedEventService {
    constructor(
    ) {}

    process(
        bot: BotSchema,
        event: ClmmPositionOpenRequestedEventPayload,
    ) {

    }
}