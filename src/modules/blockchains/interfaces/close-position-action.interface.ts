import { BotSchema } from "@modules/databases"
import { 
    LiquidityPoolState, 
    DlmmLiquidityPoolState, 
    SolanaTx
} from "./types"
import { Transaction } from "@mysten/sui/transactions"
import { PrepareClosePositionParams, PrepareClosePositionResponse } from "./types"

export interface ExecuteClosePositionParams {
  bot: BotSchema;
  state: LiquidityPoolState | DlmmLiquidityPoolState;
  isRetry: boolean;
  txb?: Transaction;
  solanaTx?: SolanaTx;
  txHash: string;
}


export interface IClosePositionActionService {
  prepare(
    params: PrepareClosePositionParams,
  ): Promise<PrepareClosePositionResponse>;
  execute(
    params: ExecuteClosePositionParams,
  ): Promise<void>;
}
