import BN from "bn.js"
import {
    BotSchema,
} from "@modules/databases"
import { Decimal } from "decimal.js"
import { SolanaTx } from "./types"
import { DlmmLiquidityPoolState, ClmmLiquidityPoolState, PrepareOpenPositionParams } from "./types"
import { SignatureWithBytes } from "@mysten/sui/cryptography"
import { Dayjs } from "dayjs"

export interface PrepareOpenPositionResult {
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
    state: ClmmLiquidityPoolState | DlmmLiquidityPoolState;
    isRetry: boolean;
    signatureWithBytes?: SignatureWithBytes
    solanaTx?: SolanaTx;
    txHash: string;
    feeAmountA: BN;
    feeAmountB: BN;
    positionId: string;
}

export interface ExecuteOpenPositionResult {
  positionId: string;
}

export interface IOpenActionService {
  prepare(
    params: PrepareOpenPositionParams,
  ): Promise<PrepareOpenPositionResult>;
  // open position
  execute(
    params: ExecuteOpenPositionParams,
  ): Promise<ExecuteOpenPositionResult>;
  // confirm open position
  confirm(
    params: ConfirmOpenPositionParams,
  ): Promise<ConfirmOpenPositionResult>;
}

export interface CreateExecuteResult {
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
  state: ClmmLiquidityPoolState | DlmmLiquidityPoolState;
}

export interface ConfirmOpenPositionResult {
  liquidity?: BN;
}

export interface FeesParams {
  bot: BotSchema
  state: ClmmLiquidityPoolState | DlmmLiquidityPoolState;
}

export interface FeesResult {
  feeA: Decimal;
  feeB: Decimal;
  rewards: Array<Decimal>;
  snapshotAt: Dayjs;
}

export interface IFeesService {
  fees(
    params: FeesParams,
  ): Promise<FeesResult>;
}

export interface ReservesParams {
  state: ClmmLiquidityPoolState | DlmmLiquidityPoolState;
  bot: BotSchema;
}

export interface ReservesResult {
  reserveA: Decimal;
  reserveB: Decimal;
  snapshotAt: Dayjs;
}

export interface IReservesService {
  reserves(
    params: ReservesParams,
  ): Promise<ReservesResult>;
}