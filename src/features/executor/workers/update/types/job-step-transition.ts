import {
    TaskType 
} from "@modules/databases"
/**
 * Parameters for rolling back a step to Sign with a failure.
 */
export interface RollbackToSignWithFailureParams {
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
  }