import {
    BotSchema, JobSchema 
} from "@modules/databases"

/**
 * Parameters for loading the job context.
 */
export interface LoadJobContextParams {
    /** Job ID. */
    jobId: string
    /** Bot ID. */
    botId: string
}

/**
 * Result of loading the job context.
 */
export interface LoadJobContextResult {
    /** Job. */
    job: JobSchema
    /** Bot. */
    bot: BotSchema
}
/**
 * Runtime context for a job.
 */
export interface JobRuntimeContext {
    /** Job. */
    /** Bot. */
    bot: BotSchema
}