import {
    BotSchema 
} from "@modules/databases"
import { 
    LiquidityPoolState, 
    SolanaTx
} from "./types"
import {
    SignatureWithBytes 
} from "@mysten/sui/cryptography"
import {
    PrepareClosePositionParams, PrepareClosePositionResult 
} from "./types"

export interface ExecuteClosePositionParams {
  bot: BotSchema;
  state: LiquidityPoolState;
  txCheck: boolean;
  signatureWithBytes?: SignatureWithBytes;
  solanaTx?: SolanaTx;
  txHash: string;
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
