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
    UpsertPreparedResult 
} from "./types"
import {
    Injectable 
} from "@nestjs/common"
import {   
    RollbackRemoveTaskByIndexParams 
} from "./types"
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
                                                                        // if task already exists -> mark not-initialized + bump retries
                                                                        initialized: false,
                                                                        retries: {
                                                                            $add: [{
                                                                                $ifNull: ["$$t.retries",
                                                                                    0] 
                                                                            },
                                                                            1],
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
                                                // if task doesn't exist -> append new taskDoc (initialized=true, retries=0)
                                                $concatArrays: ["$$tasksSafe",
                                                    [taskDoc]],
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
                }
            )
      
        assert(updatedJobResult.modifiedCount > 0)      
    }

    /**
     * Rolls back a task by index.
     * @param params - The parameters for the rollback.
     * @returns A promise that resolves when the rollback is complete.
     */
    async rollbackRemoveTaskByIndex(
        {
            jobId,
            taskIndex,
            session,
        }: RollbackRemoveTaskByIndexParams
    ): Promise<void> {
        const updatedJobResult = await this.connection.model<JobSchema>(JobSchema.name).updateOne(
            {
                _id: jobId 
            },
            [
                {
                    $set: {
                        tasks: {
                            $filter: {
                                input: {
                                    $ifNull: ["$tasks",
                                        []] 
                                },
                                as: "t",
                                cond: {
                                    $ne: ["$$t.index",
                                        taskIndex] 
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