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
    RollbackToSignParams 
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
        }: RollbackToPreparedParams
    ): Promise<void> {
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
      
                                                        // reset ALL step retries
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
                                                                        {
                                                                            signRetries: 0,
                                                                            executeRetries: 0,
                                                                        },
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
}