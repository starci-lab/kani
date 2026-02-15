import BN from "bn.js"
import {
    JobType,
    TaskType 
} from "@modules/databases"

/** Base payload for all action jobs. */
export interface BasePayload {
  jobId: string
  botId: string
  isRetry?: boolean
  /** Whether to use the context. */
  useContext?: boolean
}

/** Payload for open position action tasks. */
export interface OpenPositionActionTaskPayload {
  liquidityPoolId: string
}

/** Payload for close position action tasks. */
export interface ClosePositionActionTaskPayload {
  liquidityPoolId: string
}

/** Payload for reconcile balance action tasks. */
export interface ReconcileBalanceActionTaskPayload {
  /** Whether to perform the swap. */
  swap?: boolean
  /** Whether to perform the balance reconciliation. */
  reconcile?: boolean
}

/** Token input for withdraw operations. */
export interface WithdrawTokenInput {
  tokenId: string
  amount: BN
}

/** Task for an action. */
export interface OpenPositionActionTask {
  type: TaskType.OpenPosition
  payload: OpenPositionActionTaskPayload
}

/** Task for an action. */
export interface ClosePositionActionTask {
  type: TaskType.ClosePosition
  payload: ClosePositionActionTaskPayload
}

/** Task for an action. */
export interface ReconcileBalanceActionTask {
  type: TaskType.ReconcileBalance
  payload: ReconcileBalanceActionTaskPayload
  useContext?: boolean
}

export type WithdrawActionTaskPayload = Record<string, never>
/** Task for an action. */
export interface WithdrawActionTask {
  type: TaskType.Withdraw
  payload: WithdrawActionTaskPayload
}

/** Union of all supported action tasks. */
export type ActionTask =
  | OpenPositionActionTask
  | ClosePositionActionTask
  | ReconcileBalanceActionTask
  | WithdrawActionTask

/** Action job payload. */
export interface ActionPayload extends BasePayload {
  /** Tasks to execute. */
  tasks: Array<ActionTask>
  /** Liquidity pool to use. */
  type: JobType
}

