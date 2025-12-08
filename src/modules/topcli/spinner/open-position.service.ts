import { Injectable } from "@nestjs/common"
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
import { SpinnerRegistryService } from "./registry.service"

@Injectable()
export class SpinnerOpenPositionService {
    constructor(
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    private readonly spinnerRegistryService: SpinnerRegistryService,
    ) {}

    private title(bot: BotSchema, liquidityPoolId: LiquidityPoolId) {
        const boldPink = chalk.bold.hex("#FE6D9C")
        return boldPink(
            `[OPEN POSITION] ${bot.name} - ${bot.chainId} - ${liquidityPoolId}`,
        )
    }

    private logSpinnerInfo(id: string, description: string) {
        const spinner = this.spinnerRegistryService.spinner(id)
        const text = spinner.text
        spinner.text = `${text}  ${chalk.dim.white(`${description}`)}`
    }

    public onStart(
        { 
            bot, 
            liquidityPoolId 
        }: OnStartParams
    ) {
        const id = uuidv4()
        const spinner = this.spinnerRegistryService.spinner(id)
        spinner.start(
            this.title(
                bot, 
                liquidityPoolId
            )
        )
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
        this.logSpinnerInfo(
            id, 
            `Target ${computeDenomination(desiredTargetAmount, targetToken.decimals)} ${targetToken.symbol}, Quote ${computeDenomination(desiredQuoteAmount, quoteToken.decimals)} ${quoteToken.symbol}, Gas ${computeDenomination(desiredGasAmount, gasToken.decimals)} ${gasToken.symbol}.`
        )
    }

    onTxExecutedSuccessfully({
        id,
        txHash,
    }: OnTxExecutedSuccessfullyParams) {
        this.logSpinnerInfo(id, `Tx ${txHash} executed successfully.`)
    }

    onSuccess({
        id,
    }: OnSuccessParams) {
        const spinner = this.spinnerRegistryService.spinner(id)
        const text = spinner.text
        spinner.succeed(`${text} \n ${chalk.green.dim("Successfully opened position.")}`)
    }

    onFail({
        id,
    }: OnFailParams) {
        const spinner = this.spinnerRegistryService.spinner(id)
        const text = spinner.text
        spinner.failed(`${text} \n ${chalk.red.dim("Failed to open position")}`)
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

interface OnTxExecutedSuccessfullyParams {
  id: string;
  txHash: string;
}

interface OnSuccessParams {
  id: string;
}

interface OnFailParams {
  id: string;
}