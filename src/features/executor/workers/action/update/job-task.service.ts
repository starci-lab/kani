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
    ClientSession,
    Connection 
} from "mongoose"
import {
    UpsertPreparedTaskParams,
    UpsertPreparedResult,
    UpdatePrepareProcessingRetriesParams,
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
        const query = async (clientSession?: ClientSession) => {
            const result = await this.connection
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
                        session: clientSession 
                    },
                )
            // Ensure job exists (and ideally the update is applied)
            assert(result.matchedCount > 0)
        }
        if (!session) {
            const clientSession = await this.connection.startSession()
            await clientSession.withTransaction(async (clientSession) => {
                await query(clientSession)
            })
        } else {
            await query(session)
        }
    }

    /**
     * Increments the prepare processing retries for a task.
     * @param params - The parameters (jobId, taskIndex, optional session).
     */
    async updatePrepareProcessingRetries({
        jobId,
        taskIndex,
        session,
    }: UpdatePrepareProcessingRetriesParams): Promise<void> {
        const query = async (clientSession?: ClientSession): Promise<void> => {
            const result = await this.connection
                .model<JobSchema>(JobSchema.name)
                .updateOne(
                    {
                        _id: jobId,
                        "tasks.index": taskIndex,
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
                                                            prepareProcessingRetries: {
                                                                $add: [
                                                                    {
                                                                        $ifNull: [
                                                                            "$$t.prepareProcessingRetries",
                                                                            0,
                                                                        ],
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
                        session: clientSession,
                    },
                )
    
            assert(result.matchedCount > 0)
        }
    
        if (!session) {
            const clientSession = await this.connection.startSession()
            await clientSession.withTransaction(async () => {
                await query(clientSession)
            })
            return
        }
    
        await query(session)
    }
}