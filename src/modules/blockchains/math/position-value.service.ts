import {
    Injectable 
} from "@nestjs/common"
import Decimal from "decimal.js"
import {
    BotSchema, PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    TokenType 
} from "@modules/typedefs"
import {
    TokenNotFoundException 
} from "@modules/exceptions"
import {
    computeDenomination 
} from "@modules/utils"
import BN from "bn.js"
import {
    PriceService 
} from "./price.service"

@Injectable()
export class PositionValueMathService {
    constructor(
        private readonly priceService: PriceService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    public async calculatePositionValue(
        {
            before,
            after,
            bot,
            isOpen,
        }: CalculatePositionValueParams
    ): Promise<CalculatePositionValueResult> {
        const targetToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: bot.targetToken.toString()
            }
        })
        if (!targetToken) {
            throw new TokenNotFoundException({
                id: bot.targetToken.toString()
            })
        }
        const quoteToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: bot.quoteToken.toString()
            }
        })
        if (!quoteToken) {
            throw new TokenNotFoundException({
                id: bot.quoteToken.toString()
            })
        }
        const gasToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            type: {
                $eq: TokenType.Native
            },
            chainId: {
                $eq: bot.chainId
            }
        })
        if (!gasToken) {
            throw new TokenNotFoundException({
                conditions: {
                    type: TokenType.Native,
                    chainId: bot.chainId,
                },
            })
        }

        const { price: beforeTargetPrice } = await this.priceService.resolvePrice(
            {
                tokenId: targetToken.displayId,
            }
        )
        const { price: beforeQuotePrice } = await this.priceService.resolvePrice(
            {
                tokenId: quoteToken.displayId,
            }
        )
        const { price: beforeGasPrice } = await this.priceService.resolvePrice(
            {
                tokenId: gasToken.displayId,
            }
        )
        const quoteTargetPrice = beforeQuotePrice.div(beforeTargetPrice)
        const gasTargetPrice = beforeGasPrice.div(beforeTargetPrice)
        
        // priceA/priceB
        const beforeTargetBalanceAmountInTarget = computeDenomination(
            before.targetBalanceAmount, 
            targetToken.decimals
        )
        const beforeQuoteBalanceAmountInTarget = computeDenomination(
            before.quoteBalanceAmount, 
            quoteToken.decimals
        ).mul(quoteTargetPrice)
        const beforeGasBalanceAmountInTarget = computeDenomination(
            before.gasBalanceAmount, 
            gasToken.decimals
        ).mul(gasTargetPrice)
        const beforeTotalBalanceAmountInTarget = beforeTargetBalanceAmountInTarget.add(
            beforeQuoteBalanceAmountInTarget
        ).add(beforeGasBalanceAmountInTarget)
        const afterTargetBalanceAmountInTarget = computeDenomination(
            after.targetBalanceAmount, 
            targetToken.decimals
        )
        const afterQuoteBalanceAmountInTarget = computeDenomination(
            after.quoteBalanceAmount, 
            quoteToken.decimals
        ).mul(quoteTargetPrice)
        const afterGasBalanceAmountInTarget = computeDenomination(
            after.gasBalanceAmount, 
            gasToken.decimals
        ).mul(gasTargetPrice)
        const afterTotalBalanceAmountInTarget = afterTargetBalanceAmountInTarget.add(
            afterQuoteBalanceAmountInTarget
        ).add(afterGasBalanceAmountInTarget)      
        const diffInTarget = afterTotalBalanceAmountInTarget.sub(beforeTotalBalanceAmountInTarget)
        const positionValue = isOpen ? diffInTarget.neg() : diffInTarget
        return {
            positionValue,
        }
    }
}

export interface CalculatePositionValueParams {
    before: CalculatePositionValue,
    after: CalculatePositionValue,
    bot: BotSchema,
    isOpen: boolean,
}

export interface CalculatePositionValue {
    targetBalanceAmount: BN
    quoteBalanceAmount: BN
    gasBalanceAmount: BN
}

export interface CalculatePositionValueResult {
    positionValue: Decimal
}