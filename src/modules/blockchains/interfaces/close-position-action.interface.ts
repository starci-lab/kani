import {
    BotSchema 
} from "@modules/databases"
import { 
    LiquidityPoolState, 
    PrepareTx,
} from "./types"

export interface PrepareClosePositionParams {
  bot: BotSchema;
  state: LiquidityPoolState;
}

export interface PrepareClosePositionResult {
  prepareTxs: Array<PrepareTx>
}

export interface ExecuteClosePositionParams {
  bot: BotSchema;
  state: LiquidityPoolState;
  txCheck: boolean;
  prepareTxs: Array<PrepareTx>
  stimulate?: boolean;
}

export interface IClosePositionActionService {
  prepare(
    params: PrepareClosePositionParams,
  ): Promise<PrepareClosePositionResult>;
  execute(
    params: ExecuteClosePositionParams,
  ): Promise<void>;
}
