import { Types } from "mongoose"
import { JobSchema } from "@modules/databases"

export interface FailedJobsPollerResult {
    _id: Types.ObjectId
    latestJob: JobSchema & { id: string }
    deleteIds: Array<Types.ObjectId>
}