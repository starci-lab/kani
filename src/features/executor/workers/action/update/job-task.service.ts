import {
    InjectPrimaryMongoose, 
    JobSchema, 
    StepType
} from "@modules/databases"
import {
    InjectSuperJson 
} from "@modules/mixin"
import SuperJSON from "superjson"
import {
    Connection 
} from "mongoose"
import {
    UpsertPreparedTaskParams,
    UpsertPreparedResult, 
    RollbackToPreparedParams
} from "./types"
import {
    Injectable 
} from "@nestjs/common"
import { 
    strict as assert 
} from "node:assert"

/**
 * Service for managing job tasks.
 */
@Injectable()
export class JobTaskService {
    constructor(
    @InjectPrimaryMongoose()
    private readonly connection: Connection,
    @InjectSuperJson()
    private readonly superJson: SuperJSON,
    ) {}

    /**
     * Upserts a prepared task into the database.   
     * @param params The parameters for upserting a prepared task.
     * @returns A promise that resolves when the task is upserted.
     */
    async upsertPreparedTask<T extends UpsertPreparedResult>({
        jobId,
        taskType,
        taskIndex,
        prepareResult,
        session,
    }: UpsertPreparedTaskParams<T>): Promise<void> {
        // create the task document
        const taskDoc = {
            index: taskIndex,
            type: taskType,
            prepareResult: this.superJson.stringify(prepareResult),
            activeStep: 0,
            initialized: true,
            retries: 0,
            stepCount: prepareResult.prepareTxs.length,
            steps: prepareResult.prepareTxs.map((prepareTx, index: number) => ({
                index,
                type: StepType.Sign,
                prepareTx: this.superJson.stringify(prepareTx),
            })),
        }

        // upsert the task into the database
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
                                $let: {
                                    vars: {
                                        tasksSafe: {
                                            $ifNull: ["$tasks",
                                                []] 
                                        },
                                        exists: {
                                            $in: [
                                                taskIndex,
                                                {
                                                    $map: {
                                                        input: {
                                                            $ifNull: ["$tasks",
                                                                []] 
                                                        },
                                                        as: "t",
                                                        in: "$$t.index",
                                                    },
                                                },
                                            ],
                                        },
                                    },
                                    in: {
                                        $cond: [
                                            "$$exists",
                                            {
                                                // update existing task
                                                $map: {
                                                    input: "$$tasksSafe",
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
                                                                    taskDoc,
                                                                    {
                                                                        // refresh prepared snapshot and mark it as initialized again
                                                                        initialized: true,

                                                                        // bump retries because we are re-preparing/retrying the task
                                                                        retries: {
                                                                            $add: [
                                                                                {
                                                                                    $ifNull: ["$$t.retries",
                                                                                        0] 
                                                                                },
                                                                                1,
                                                                            ],
                                                                        },
                                                                    },
                                                                ],
                                                            },
                                                            "$$t",
                                                        ],
                                                    },
                                                },
                                            },
                                            {
                                                // append new task
                                                $concatArrays: [
                                                    "$$tasksSafe",
                                                    [taskDoc]
                                                ],
                                            },
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

        // Ensure job exists (and ideally the update is applied)
        assert(updatedJobResult.matchedCount > 0)
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
                    _id: jobId,
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
                                                        retries: {
                                                            $add: [
                                                                {
                                                                    $ifNull: ["$$t.retries",
                                                                        0] 
                                                                },
                                                                1,
                                                            ],
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