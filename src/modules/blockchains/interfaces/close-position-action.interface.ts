import { BotSchema } from "@modules/databases"
import { 
    LiquidityPoolState, 
    DlmmLiquidityPoolState, 
    SolanaTx
} from "./types"
import { SignatureWithBytes } from "@mysten/sui/cryptography"
import { PrepareClosePositionParams, PrepareClosePositionResult } from "./types"

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
  ): Promise<PrepareClosePositionResult>;
  execute(
    params: ExecuteClosePositionParams,
  ): Promise<void>;
}
