import {
    BotSchema, 
} from "@modules/databases"
import Decimal from "decimal.js"

/** Parameters for getting balance amount in USD. */
export interface GetBalanceAmountInUsdParams {
    bot: BotSchema
}

/** Result of getting balance amount in USD. */
export interface GetBalanceAmountInUsdResult {
    balanceAmountInUsd: Decimal
}
