import {
    PrimaryMemoryStorageService,
    TokenId,
} from "@modules/databases"
import {
    Injectable,
} from "@nestjs/common"
import {
    TokenType,
} from "@typedefs"
import {
    TokenNotFoundException,
} from "@exceptions"
import {
    GasStatus,
} from "../types"

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
            targetTokenId,
            quoteTokenId,
        }: GetGasStatusParams,
    ): GasStatus {
        // Lookup target token
        const targetToken = this.primaryMemoryStorageService
            .tokenCollection
            .findOne({
                displayId: {
                    $eq: targetTokenId 
                },
            })

        if (!targetToken) {
            throw new TokenNotFoundException(
                {
                    displayId: targetTokenId,
                }
            )
        }

        // Lookup quote token
        const quoteToken = this.primaryMemoryStorageService
            .tokenCollection
            .findOne({
                displayId: {
                    $eq: quoteTokenId 
                },
            })

        if (!quoteToken) {
            throw new TokenNotFoundException(
                {
                    displayId: quoteTokenId,
                }
            )
        }

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

export interface GetGasStatusParams {
    /** Token being traded / bought */
    targetTokenId: TokenId

    /** Token used to quote the price */
    quoteTokenId: TokenId
}