import {
    Injectable 
} from "@nestjs/common"
import { 
    ConfirmWithdrawalRequestDto,
} from "./dtos"
import {
    EventEmitterService, 
    EventName
} from "@modules/event"

/**
 * Service to confirm a withdrawal for the given transaction hashes and received tokens.
 */
@Injectable()
export class ConfirmWithdrawalService {
    constructor(
        private readonly eventEmitterService: EventEmitterService,
    ) {}

    /**
     * Confirm a withdrawal for the given transaction hashes and received tokens.
     * @param request - The request containing the bot ID, transaction hashes, and received tokens.
     * @returns A promise that resolves when the withdrawal is confirmed.
     */
    async confirmWithdrawal(
        request: ConfirmWithdrawalRequestDto,
    ): Promise<void> {
        const {
            botId,
            txHashes,
            receivedTokens,
        } = request
        this.eventEmitterService.emit({
            event: EventName.ConfirmWithdrawal,
            payload: {
                botId,
                txHashes,
                receivedTokens,
            },
        })
    }
}

