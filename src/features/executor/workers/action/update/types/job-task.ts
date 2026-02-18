import {
    PrepareTx 
} from "@modules/blockchains"
import {
    TaskType 
} from "@modules/databases"
import {
    ClientSession 
} from "mongoose"

export interface UpsertPreparedResult {
    /**
     * The prepare result of the task.
     */
    prepareTxs: Array<PrepareTx>
}
/**
 * Represents the parameters for upserting a job task prepare.
 */
export interface UpsertPreparedTaskParams<T extends UpsertPreparedResult> {
    /**
     * The ID of the job.
     */
    jobId: string
    /**
     * The type of the task.
     */
    taskType: TaskType
    /**
     * The index of the task.
     */
    taskIndex: number
    /**
     * The prepare result of the task.
     */
    prepareResult: T
    /**
     * The session to use for the operation.
     */
    session?: ClientSession
}
  
/**
 * Represents the parameters for rolling back to prepared.
 */
export interface RollbackToPreparedParams {
    /**
     * The ID of the job.
     */
    jobId: string
    /**
     * The index of the task.
     */
    taskIndex: number
    /**
     * The session to use for the operation.
     */
    session?: ClientSession
}