import {
    BotSchema 
} from "@modules/databases"
import {
    Injectable 
} from "@nestjs/common"

@Injectable()
export class RequeueService {
    constructor(
    ) {}

    async requeue(
        bot: BotSchema,
    ) {
        console.log(bot)
    }
}