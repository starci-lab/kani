import { Injectable } from "@nestjs/common"
import { OraService } from "./ora.service"
import {
    BotSchema,
    LiquidityPoolId,
    PrimaryMemoryStorageService,
    TokenId,
} from "@modules/databases"
import chalk from "chalk"
import { v4 as uuidv4 } from "uuid"
import BN from "bn.js"
import { TokenNotFoundException } from "@exceptions"
import { TokenType } from "@typedefs"
import { computeDenomination } from "@utils"

@Injectable()
export class OraOpenPositionService {
    constructor(
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    private readonly oraService: OraService,
    ) {}

    private title(bot: BotSchema, liquidityPoolId: LiquidityPoolId) {
        const boldPink = chalk.bold.hex("#FE6D9C")
        return boldPink(
            `[OPEN POSITION] ${bot.name} - ${bot.chainId} - ${liquidityPoolId}`,
        )
    }

    public onStart({ bot, liquidityPoolId }: OnStartParams) {
        const id = uuidv4()
        this.oraService.start(id, this.title(bot, liquidityPoolId))
        return id
    }

    onDesiredAmountsCalculated({
        id,
        bot,
        targetTokenId,
        quoteTokenId,
        desiredTargetAmount,
        desiredQuoteAmount,
        desiredGasAmount,
    }: OnDesiredAmountsCalculatedParams) {
        const ora = this.oraService.ora(id)
        const targetToken = this.primaryMemoryStorageService.tokens.find(
            (token) => token.displayId === targetTokenId,
        )
        if (!targetToken) {
            throw new TokenNotFoundException("Target token not found")
        }
        const quoteToken = this.primaryMemoryStorageService.tokens.find(
            (token) => token.displayId === quoteTokenId,
        )
        if (!quoteToken) {
            throw new TokenNotFoundException("Quote token not found")
        }
        const gasToken = this.primaryMemoryStorageService.tokens.find(
            (token) =>
                token.type === TokenType.Native && token.chainId === bot.chainId,
        )
        if (!gasToken) {
            throw new TokenNotFoundException("Gas token not found")
        }
        ora.suffixText = `Target ${computeDenomination(desiredTargetAmount, targetToken.decimals)} ${targetToken.symbol}, Quote ${computeDenomination(desiredQuoteAmount, quoteToken.decimals)} ${quoteToken.symbol}, Gas ${computeDenomination(desiredGasAmount, gasToken.decimals)} ${gasToken.symbol}.`
       
    }
}

interface OnStartParams {
  bot: BotSchema;
  liquidityPoolId: LiquidityPoolId;
}

interface OnDesiredAmountsCalculatedParams {
  id: string;
  bot: BotSchema;
  targetTokenId: TokenId;
  quoteTokenId: TokenId;
  desiredTargetAmount: BN;
  desiredQuoteAmount: BN;
  desiredGasAmount: BN;
}
