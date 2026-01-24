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
    toDecimalAmount 
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
                token: targetToken,
            }
        )
        const { price: beforeQuotePrice } = await this.priceService.resolvePrice(
            {
                token: quoteToken,
            }
        )
        const { price: beforeGasPrice } = await this.priceService.resolvePrice(
            {
                token: gasToken,
            }
        )
        const quoteTargetPrice = beforeQuotePrice.div(beforeTargetPrice)
        const gasTargetPrice = beforeGasPrice.div(beforeTargetPrice)
        
        // priceA/priceB
        const beforeTargetBalanceAmountInTarget = toDecimalAmount({
            amount: before.targetBalanceAmount,
            decimals: new Decimal(targetToken.decimals),
        }).mul(quoteTargetPrice)
        const beforeQuoteBalanceAmountInTarget = toDecimalAmount({
            amount: before.quoteBalanceAmount,
            decimals: new Decimal(quoteToken.decimals),
        })
        const beforeGasBalanceAmountInTarget = toDecimalAmount({
            amount: before.gasBalanceAmount,
            decimals: new Decimal(gasToken.decimals),
        })
        const beforeTotalBalanceAmountInTarget = beforeTargetBalanceAmountInTarget.add(
            beforeQuoteBalanceAmountInTarget
        ).add(beforeGasBalanceAmountInTarget)
        const afterTargetBalanceAmountInTarget = toDecimalAmount({
            amount: after.targetBalanceAmount,
            decimals: new Decimal(targetToken.decimals),
        }).mul(quoteTargetPrice)
        const afterQuoteBalanceAmountInTarget = toDecimalAmount({
            amount: after.quoteBalanceAmount,
            decimals: new Decimal(quoteToken.decimals),
        }).mul(quoteTargetPrice)
        const afterGasBalanceAmountInTarget = toDecimalAmount({
            amount: after.gasBalanceAmount,
            decimals: new Decimal(gasToken.decimals),
        }).mul(gasTargetPrice)
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