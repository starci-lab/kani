import BN from "bn.js"
import {
    BotSchema,
    LiquidityPoolId,
} from "@modules/databases"
import { Decimal } from "decimal.js"
import { SolanaTx } from "./types"
import { DlmmLiquidityPoolState, LiquidityPoolState, PrepareOpenPositionParams } from "./types"
import { SignatureWithBytes } from "@mysten/sui/cryptography"

export interface PrepareOpenPositionResponse {
  txHash: string;
  signatureWithBytes?: SignatureWithBytes;
  solanaTx?: SolanaTx;
  feeAmountA: BN;
  feeAmountB: BN;
  tickLower?: Decimal;
  tickUpper?: Decimal;
  amountA?: BN;
  amountB?: BN;
  minBinId?: Decimal;
  maxBinId?: Decimal;
  metadata?: unknown;
  positionId?: string;
}

export interface ExecuteOpenPositionParams {
    bot: BotSchema;
    state: LiquidityPoolState | DlmmLiquidityPoolState;
    isRetry: boolean;
    signatureWithBytes?: SignatureWithBytes
    solanaTx?: SolanaTx;
    txHash: string;
    feeAmountA: BN;
    feeAmountB: BN;
    positionId?: string;
}

export interface ExecuteOpenPositionResponse {
  positionId: string;
}

export interface IOpenActionService {
  prepare(
    params: PrepareOpenPositionParams,
  ): Promise<PrepareOpenPositionResponse>;
  // open position
  execute(
    params: ExecuteOpenPositionParams,
  ): Promise<ExecuteOpenPositionResponse>;
  // confirm open position
  confirm(
    params: ConfirmOpenPositionParams,
  ): Promise<ConfirmOpenPositionResponse>;
}

export interface CreateExecuteResponse {
  metadata?: unknown;
  // fee amount in target token
  feeAmountTarget: BN;
  // fee amount in quote token
  feeAmountQuote: BN;
  // position id
  positionId: string;
  // liquidity
  liquidity?: BN;
  // tick lower
  tickLower?: Decimal;
  // tick upper
  tickUpper?: Decimal;
  // bin min id
  minBinId?: Decimal;
  // bin max id
  maxBinId?: Decimal;
  // amount a
  amountA?: BN;
  // amount b
  amountB?: BN;
}

export interface ConfirmOpenPositionParams {
  positionId: string;
  state: LiquidityPoolState | DlmmLiquidityPoolState;
}

export interface ConfirmOpenPositionResponse {
  liquidity?: BN;
}

export interface FeesParams {
  bot: BotSchema
  liquidityPoolId: LiquidityPoolId
  state: LiquidityPoolState | DlmmLiquidityPoolState;
}

export interface FeesResponse {
  tokenA: Decimal;
  tokenB: Decimal;
}

export interface IFeesService {
  fees(
    params: FeesParams,
  ): Promise<FeesResponse>;
}