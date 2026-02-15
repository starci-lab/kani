import {
    InjectPrimaryMongoose, JobSchema, StepType 
} from "@modules/databases"
import {
    DayjsService 
} from "@modules/mixin"
import {
    Injectable 
} from "@nestjs/common"
import {
    Connection 
} from "mongoose"
import {
    RollbackToSignWithFailureParams 
} from "./types"

/**
 * Service responsible for rolling back a step to Sign and appending a failure record, incrementing retries atomically.
 */
@Injectable()
export class JobStepTransitionService {
    constructor(
    @InjectPrimaryMongoose()
    private readonly connection: Connection,
    private readonly dayjsService: DayjsService,
    ) {}

    /**
     * Rolls back a step to Sign and appends a failure record, incrementing retries atomically.
     * @param params - The parameters for the rollback.
     * @returns A promise that resolves when the rollback is complete.
     */
    async rollbackToSignWithFailure({
        jobId,
        taskType,
        taskIndex,
        stepIndex,
        error,
    }: RollbackToSignWithFailureParams): Promise<void> {
        await this.connection.model<JobSchema>(JobSchema.name).updateOne(
            {
                _id: jobId 
            },
            [
                {
                    $set: {
                        tasks: {
                            $map: {
                                input: "$tasks",
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
                                                            input: "$$task.steps",
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
                                                                                                errorMessage: error.message,
                                                                                                stackTrace: error.stack ?? `${error}`,
                                                                                                snapshotAt: this.dayjsService.now().toDate(),
                                                                                            },
                                                                                        ],
                                                                                    ],
                                                                                },

                                                                                // increment retries
                                                                                retries: {
                                                                                    $add: [{
                                                                                        $ifNull: ["$$step.retries",
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
    }
}