import {
    Injectable 
} from "@nestjs/common"
import { 
    ConfirmWithdrawalRequestDto,
} from "./dtos"

/**
 * Service to confirm a withdrawal for the given transaction hashes and received tokens.
 */
@Injectable()
export class ConfirmWithdrawalService {
    constructor(
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
        console.log(
            botId,
            txHashes,
            receivedTokens
        )
    }
}

