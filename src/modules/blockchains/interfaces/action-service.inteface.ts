import BN from "bn.js"
import { FetchedPool } from "./types"
import { ActionResponse } from "../dexes"
import {
    BotSchema,
    LiquidityPoolSchema,
    TokenId,
    UserSchema,
} from "@modules/databases"
import { Network } from "@typedefs"
import { SuiClient } from "@mysten/sui/client"
import {
    DynamicDlmmLiquidityPoolInfo,
    DynamicLiquidityPoolInfo,
} from "../types"

export interface LiquidityPoolState {
  static: LiquidityPoolSchema;
  dynamic: DynamicLiquidityPoolInfo;
}

export interface DlmmLiquidityPoolState {
  static: LiquidityPoolSchema;
  dynamic: DynamicDlmmLiquidityPoolInfo;
}

export interface ClosePositionParams {
  bot: BotSchema;
  state: LiquidityPoolState | DlmmLiquidityPoolState;
}

export interface OpenPositionParams {
  bot: BotSchema;
  state: LiquidityPoolState | DlmmLiquidityPoolState;
}

export interface ClosePositionResponse extends ActionResponse {
  suiTokenOuts?: Partial<Record<TokenId, BN>>;
}

export interface SwapParams {
  pool: FetchedPool;
  network?: Network;
  accountAddress: string;
  tokenInId: TokenId;
  tokenOutId: TokenId;
  amountIn: BN;
  slippage?: number;
  priceLimit?: number;
  // user to sign the tx
  user?: UserSchema;
  suiClient?: SuiClient;
}

export interface IActionService {
  // close position
  closePosition(
    params: ClosePositionParams,
  ): Promise<ClosePositionResponse | null>;
  // open position
  openPosition(
    params: OpenPositionParams,
  ): Promise<OpenPositionResponse | null>;
}

export interface OpenPositionResponse {
  txHash: string;
  // unknown mean something that is not known at the time of the response
  execute: () => Promise<CreateExecuteResponse>;
}

export interface CreateExecuteResponse {
  metadata: unknown;
  // fee amount in target token
  feeAmountTarget: BN;
  // fee amount in quote token
  feeAmountQuote: BN;
  // position id
  positionId: string;
}

export interface ClosePositionResponse {
  txHash: string;
  // unknown mean something that is not known at the time of the response
  execute: () => Promise<void>;
}
