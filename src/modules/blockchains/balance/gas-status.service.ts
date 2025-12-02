import { PrimaryMemoryStorageService, TokenId } from "@modules/databases"
import { Injectable } from "@nestjs/common"
import { TokenType } from "@typedefs"
import { TokenNotFoundException } from "@exceptions"
import { GasStatus } from "../types"

@Injectable()
export class GasStatusService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    public getGasStatus(
        {
            targetTokenId,
            quoteTokenId,
        }: GetGasStatusParams
    ): GasStatus {
        const targetToken = this.primaryMemoryStorageService.tokens.find(
            (token) => token.displayId === targetTokenId
        )
        if (!targetToken) {
            throw new TokenNotFoundException("Target token not found")
        }
        const quoteToken = this.primaryMemoryStorageService.tokens.find(
            (token) => token.displayId === quoteTokenId
        )
        if (!quoteToken) {
            throw new TokenNotFoundException("Quote token not found")
        }
        if (targetToken.type === TokenType.Native) {
            return GasStatus.IsTarget
        } else if (quoteToken.type === TokenType.Native) {
            return GasStatus.IsQuote
        } else {
            return GasStatus.IsGas
        }
    }
}

export interface GetGasStatusParams {
    targetTokenId: TokenId
    quoteTokenId: TokenId
}