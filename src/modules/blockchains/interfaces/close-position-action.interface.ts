import { BotSchema } from "@modules/databases"
import { 
    LiquidityPoolState, 
    DlmmLiquidityPoolState, 
    SolanaTx
} from "./types"
import { SignatureWithBytes } from "@mysten/sui/cryptography"
import { PrepareClosePositionParams, PrepareClosePositionResponse } from "./types"

export interface ExecuteClosePositionParams {
  bot: BotSchema;
  state: LiquidityPoolState | DlmmLiquidityPoolState;
  isRetry: boolean;
  signatureWithBytes?: SignatureWithBytes;
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
