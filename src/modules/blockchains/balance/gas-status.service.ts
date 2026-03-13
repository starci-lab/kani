import {
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    Injectable,
} from "@nestjs/common"
import {
    TokenType,
} from "@modules/common"
import {
    GasStatus,
} from "../enums"
import {
    GetGasStatusParams,
} from "./types"

/**
 * Service responsible for determining gas status based on token types.
 * Determines whether gas is paid by target, quote, or separate gas token.
 *
 * @example
 * const service = new GasStatusService(...)
 * const status = service.getGasStatus({ targetTokenId, quoteTokenId })
 */
@Injectable()
export class GasStatusService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
     * Determine gas status based on target & quote token types.
     *
     * Rules:
     * - If target token is native → gas is paid by target side
     * - Else if quote token is native → gas is paid by quote side
     * - Else → gas is paid by a separate gas token
     *
     * @throws TokenNotFoundException if either token does not exist
     */
    public getGasStatus(
        {
            targetToken,
            quoteToken,
        }: GetGasStatusParams,
    ): GasStatus {
        // Determine gas status based on token types
        if (targetToken.type === TokenType.Native) {
            return GasStatus.IsTarget
        }

        if (quoteToken.type === TokenType.Native) {
            return GasStatus.IsQuote
        }

        return GasStatus.IsGas
    }
}