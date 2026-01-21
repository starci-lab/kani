import {
    Injectable 
} from "@nestjs/common"
import {
    BotSchema 
} from "@modules/databases"
import {
    v4 
} from "uuid"

export interface LockAuthority {
    // dump: string
    id: string
}
@Injectable()
export class LockAuthorityService {
    private readonly lockMap = new Map<string, LockAuthority>()
    constructor(
    ) {}

    // acquire the lock authority for the bot
    async acquire(
        bot: BotSchema,
    ) {
        const lockAuthority = this.lockMap.get(bot.id)
        if (!lockAuthority) {
            this.lockMap.set(bot.id, 
                {
                    id: v4(),
                }
            )
            return true
        }
        return false
    }

    // release the lock authority for the bot
    release(
        bot: BotSchema,
    ) {
        this.lockMap.delete(bot.id)
    }
}