import {
    InjectPrimaryMongoose, JobSchema, StepType 
} from "@modules/databases"
import {
    Injectable 
} from "@nestjs/common"
import {
    Connection 
} from "mongoose"
import {
    RollbackToPreparedParams,
    RollbackToSignParams,
    SetStepExecuteResultAndAdvanceParams,
    SetStepSignedAndAdvanceToExecuteParams,
    UpdateExecuteRetriesParams,
} from "./types"
import {
    strict as assert 
} from "node:assert"
/**
 * Service responsible for managing job steps.
 */
@Injectable()
export class JobStepService {
    constructor(
    @InjectPrimaryMongoose()
    private readonly connection: Connection,
    ) {}

    /**
     * Rolls back a step to Sign, incrementing retries atomically.
     * @param params - The parameters for the rollback.
     * @returns A promise that resolves when the rollback is complete.
     */
    async rollbackToSign({
        jobId,
        taskType,
        taskIndex,
        stepIndex,
        error,
    }: RollbackToSignParams): Promise<void> {
        const errorMessage =
          (error as Error)?.message?.toString?.() ?? `${error ?? "Unknown error"}`
        const stackTrace =
          (error as Error)?.stack?.toString?.() ?? `${error ?? "Unknown error"}`
      
        const updatedJobResult = await this.connection
            .model<JobSchema>(JobSchema.name)
            .updateOne(
                {
                    _id: jobId 
                },
                [
                    {
                        $set: {
                            tasks: {
                                $map: {
                                    input: {
                                        $ifNull: ["$tasks",
                                            []] 
                                    },
                                    as: "task",
                                    in: {
                                        $cond: [
                                            {
                                                $and: [
                                                    {
                                                        $eq: ["$$task.index",
                                                            taskIndex] 
                                                    },
                                                    {
                                                        $eq: ["$$task.type",
                                                            taskType] 
                                                    },
                                                ],
                                            },
                                            {
                                                $mergeObjects: [
                                                    "$$task",
                                                    {
                                                        steps: {
                                                            $map: {
                                                                input: {
                                                                    $ifNull: ["$$task.steps",
                                                                        []] 
                                                                },
                                                                as: "step",
                                                                in: {
                                                                    $cond: [
                                                                        {
                                                                            $eq: ["$$step.index",
                                                                                stepIndex] 
                                                                        },
                                                                        {
                                                                            $mergeObjects: [
                                                                                "$$step",
                                                                                {
                                                                                    // rollback
                                                                                    type: StepType.Sign,
      
                                                                                    // append failure
                                                                                    txFailures: {
                                                                                        $concatArrays: [
                                                                                            {
                                                                                                $ifNull: ["$$step.txFailures",
                                                                                                    []] 
                                                                                            },
                                                                                            [
                                                                                                {
                                                                                                    errorMessage,
                                                                                                    stackTrace,
                                                                                                    snapshotAt: "$$NOW", // or this.dayjsService.now().toDate()
                                                                                                },
                                                                                            ],
                                                                                        ],
                                                                                    },
      
                                                                                    // reset executeRetries
                                                                                    executeRetries: 0,
      
                                                                                    // increment signRetries
                                                                                    signRetries: {
                                                                                        $add: [{
                                                                                            $ifNull: ["$$step.signRetries",
                                                                                                0] 
                                                                                        },
                                                                                        1],
                                                                                    },
                                                                                },
                                                                            ],
                                                                        },
                                                                        "$$step",
                                                                    ],
                                                                },
                                                            },
                                                        },
                                                    },
                                                ],
                                            },
                                            "$$task",
                                        ],
                                    },
                                },
                            },
                        },
                    },
                ],
            )
      
        assert(updatedJobResult.modifiedCount > 0)
    }

    /**
     * Rolls back a task to prepared.
     * @param params The parameters for rolling back a task to prepared.
     * @returns A promise that resolves when the task is rolled back to prepared.
     */
    async rollbackToPrepared(
        {
            jobId,
            taskIndex,
            session,
            incrementSignProcessingRetries,
        }: RollbackToPreparedParams
    ): Promise<void> {
        const stepUpdateFields: Record<string, unknown> = {
            signRetries: 0,
            executeRetries: 0,
        }
        if (incrementSignProcessingRetries) {
            stepUpdateFields.signProcessingRetries = {
                $add: [
                    {
                        $ifNull: [
                            "$$s.signProcessingRetries",
                            0,
                        ],
                    },
                    1,
                ],
            }
        }
        const updatedJobResult = await this.connection
            .model<JobSchema>(JobSchema.name)
            .updateOne(
                {
                    _id: jobId 
                },
                [
                    {
                        $set: {
                            tasks: {
                                $map: {
                                    input: {
                                        $ifNull: ["$tasks",
                                            []] 
                                    },
                                    as: "t",
                                    in: {
                                        $cond: [
                                            {
                                                $eq: ["$$t.index",
                                                    taskIndex] 
                                            },
                                            {
                                                $mergeObjects: [
                                                    "$$t",
                                                    {
                                                        initialized: false,
      
                                                        // increment task-level retries
                                                        retries: {
                                                            $add: [{
                                                                $ifNull: ["$$t.retries",
                                                                    0] 
                                                            },
                                                            1],
                                                        },
      
                                                        // reset step retries; optionally increment signProcessingRetries per step
                                                        steps: {
                                                            $map: {
                                                                input: {
                                                                    $ifNull: ["$$t.steps",
                                                                        []] 
                                                                },
                                                                as: "s",
                                                                in: {
                                                                    $mergeObjects: [
                                                                        "$$s",
                                                                        stepUpdateFields,
                                                                    ],
                                                                },
                                                            },
                                                        },
                                                    },
                                                ],
                                            },
                                            "$$t",
                                        ],
                                    },
                                },
                            },
                        },
                    },
                ],
                {
                    session 
                },
            )
        assert(updatedJobResult.matchedCount > 0)
    }

    /**
     * Updates the execute retries of a step.
     * @param params The parameters for updating the execute retries.
     * @returns A promise that resolves when the execute retries are updated.
     */
    async updateExecuteRetries({
        jobId,
        taskIndex,
        stepIndex,
        taskType  
    }: UpdateExecuteRetriesParams): Promise<void> {
        const updatedJobResult = await this.connection.model<JobSchema>(JobSchema.name).updateOne(
            {
                _id: jobId,
            },
            {
                $inc: {
                    "tasks.$[task].steps.$[step].executeRetries": 1,
                },
            },
            {
                arrayFilters: [
                    {
                        "task.index": taskIndex,
                        "task.type": taskType,
                    },
                    {
                        "step.index": stepIndex,
                    },
                ],
            },
        )
        assert(updatedJobResult.matchedCount > 0)
    }

    /**
     * Sets the step's signedTx and advances the step type to Execute.
     * @param params - jobId, taskType, taskIndex, stepIndex, signedTx (serialized).
     */
    async setStepSignedAndAdvanceToExecute({
        jobId,
        taskType,
        taskIndex,
        stepIndex,
        signedTx,
    }: SetStepSignedAndAdvanceToExecuteParams): Promise<void> {
        const result = await this.connection
            .model<JobSchema>(JobSchema.name)
            .updateOne(
                {
                    _id: jobId,
                },
                {
                    $set: {
                        "tasks.$[task].steps.$[step].type": StepType.Execute,
                        "tasks.$[task].steps.$[step].signedTx": signedTx,
                        "tasks.$[task].steps.$[step].signProcessingRetries": 0,
                    },
                },
                {
                    arrayFilters: [
                        {
                            "task.index": taskIndex,
                            "task.type": taskType,
                        },
                        {
                            "step.index": stepIndex,
                        },
                    ],
                },
            )
        assert(result.matchedCount > 0)
    }

    /**
     * Sets the step's executeResult, advances task activeStep by 1, and resets step retries
     * (executeRetries, signRetries, signProcessingRetries) to 0.
     */
    async setStepExecuteResultAndAdvance({
        jobId,
        taskType,
        taskIndex,
        stepIndex,
        executeResult,
    }: SetStepExecuteResultAndAdvanceParams): Promise<void> {
        const result = await this.connection
            .model<JobSchema>(JobSchema.name)
            .updateOne(
                {
                    _id: jobId,
                },
                {
                    $set: {
                        "tasks.$[task].steps.$[step].executeResult": executeResult,
                        "tasks.$[task].steps.$[step].type": StepType.Execute,
                        "tasks.$[task].steps.$[step].executeRetries": 0,
                        "tasks.$[task].steps.$[step].signRetries": 0,
                        "tasks.$[task].steps.$[step].signProcessingRetries": 0,
                        "tasks.$[task].prepareProcessingRetries": 0,
                        "tasks.$[task].retries": 0,
                    },
                    $inc: {
                        "tasks.$[task].activeStep": 1,
                    },
                },
                {
                    arrayFilters: [
                        {
                            "task.index": taskIndex,
                            "task.type": taskType,
                        },
                        {
                            "step.index": stepIndex,
                        },
                    ],
                },
            )
        assert(result.matchedCount > 0)
    }
}