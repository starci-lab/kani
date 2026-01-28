import BN from "bn.js"
import {
    BotSchema,
} from "@modules/databases"
import {
    Decimal 
} from "decimal.js"
import {
    SolanaTx 
} from "./types"
import {
    LiquidityPoolState, PrepareOpenPositionParams 
} from "./types"
import {
    SignatureWithBytes 
} from "@mysten/sui/cryptography"
import {
    Dayjs 
} from "dayjs"

export interface PrepareOpenPositionResult {
  txHash: string;
  signatureWithBytes?: SignatureWithBytes;
  solanaTx?: SolanaTx;
  feeAmountA: BN;
  feeAmountB: BN;
  tickLower?: BN;
  tickUpper?: BN;
  amountA?: BN;
  amountB?: BN;
  minBinId?: BN;
  maxBinId?: BN;
  metadata?: unknown;
  positionId?: string;
}

export interface ExecuteOpenPositionParams {
    bot: BotSchema;
    state: LiquidityPoolState;
    txCheck: boolean;
    signatureWithBytes?: SignatureWithBytes
    solanaTx?: SolanaTx;
    txHash: string;
    positionId?: string;
    stimulate?: boolean;
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
  bot: BotSchema;
  positionId: string;
  state: LiquidityPoolState;
}

export interface ConfirmOpenPositionResult {
  liquidity?: BN;
}

export interface FeesParams {
  bot: BotSchema
  state: LiquidityPoolState;
}

export interface FeesResult {
  feeA: Decimal;
  feeB: Decimal;
  rewards: Record<string, Decimal>;
  snapshotAt: Dayjs;
}

export interface IFeesService {
  fees(
    params: FeesParams,
  ): Promise<FeesResult>;
}

export interface ReservesParams {
  state: LiquidityPoolState;
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