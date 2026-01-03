import { Types } from "mongoose"
import { JobSchema } from "@modules/databases"

export interface FailedJobsPollerResult {
    _id: Types.ObjectId
    latestJob: JobSchema
    deleteIds: Array<Types.ObjectId>
}