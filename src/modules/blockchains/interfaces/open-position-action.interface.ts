import BN from "bn.js"
import {
    BotSchema,
} from "@modules/databases"
import { Decimal } from "decimal.js"
import { Transaction } from "@mysten/sui/transactions"
import { SolanaTx } from "./types"
import { DlmmLiquidityPoolState, LiquidityPoolState, PrepareOpenPositionParams } from "./types"
import { KeyPairSigner } from "@solana/kit"

export interface PrepareOpenPositionResponse {
  txHash: string;
  txb?: Transaction;
  feeAmountA: BN;
  feeAmountB: BN;
  tickLower?: Decimal;
  tickUpper?: Decimal;
  amountA?: BN;
  amountB?: BN;
  minBinId?: Decimal;
  maxBinId?: Decimal;
  metadata?: unknown;
  ataAddress?: string;
  liquidity?: BN;
  mintKeyPair?: KeyPairSigner;
}

export interface ExecuteOpenPositionParams {
    bot: BotSchema;
    state: LiquidityPoolState | DlmmLiquidityPoolState;
    isRetry: boolean;
    txb?: Transaction;
    solanaTx?: SolanaTx;
    txHash: string;
    feeAmountA: BN;
    feeAmountB: BN;
    metadata?: unknown;
    ataAddress?: string;
    liquidity?: BN;
    mintKeyPair?: KeyPairSigner;
}

export interface ExecuteOpenPositionResponse {
  liquidity?: BN;
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
