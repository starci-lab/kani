import {
    TaskType 
} from "@modules/databases"
import type {
    ClientSession 
} from "mongoose"
/**
 * Parameters for rolling back a step to Sign with a failure.
 */
export interface RollbackToSignParams {
    /**
     * The id of the job.
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
     * The index of the step.
     */
    stepIndex: number
    /**
     * The error that occurred.
     */
    error: Error
    /**
     * Optional session for atomic transaction.
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
    /**
     * Whether to increment the sign processing retries.
     */
    incrementSignProcessingRetries?: boolean
}

/**
 * Represents the parameters for updating the execute retries.
 */
export interface UpdateExecuteRetriesParams {
    /**
     * The id of the job.
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
     * The index of the step.
     */
    stepIndex: number
    /**
     * Optional session for atomic transaction.
     */
    session?: ClientSession
}

/**
 * Parameters for setting a step as signed and advancing its type to Execute.
 */
export interface SetStepSignedAndAdvanceToExecuteParams {
    jobId: string
    taskType: TaskType
    taskIndex: number
    stepIndex: number
    /**
     * Serialized signed transaction (e.g. SuperJSON string).
     */
    signedTx: string
    /**
     * Optional session for atomic transaction.
     */
    session?: ClientSession
}

/**
 * Parameters for setting a step's execute result, advancing activeStep, and resetting step retries.
 */
export interface SetStepExecuteResultAndAdvanceParams {
    jobId: string
    taskType: TaskType
    taskIndex: number
    stepIndex: number
    /**
     * Serialized execute result (e.g. SuperJSON string).
     */
    executeResult: string
    /**
     * Optional session for atomic transaction.
     */
    session?: ClientSession
}