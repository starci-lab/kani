import {
    Injectable,
} from "@nestjs/common"
import {
    AddWithdrawJobRequest,
    AddWithdrawJobResponseDataDto,
} from "./add-withdraw-job.dto"

@Injectable()
export class AddWithdrawJobService {
    constructor() {}

    async addWithdrawJob(
        {
            tokenInputs,
        }: AddWithdrawJobRequest,
    ): Promise<AddWithdrawJobResponseDataDto> {
        // TODO: Implement add withdraw job logic
        console.log(tokenInputs)
        return {
            jobId: "123",
        }
    }
}
