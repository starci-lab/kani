import {
    Injectable,
} from "@nestjs/common"
import {
    AddWithdrawJobRequestDto,
    AddWithdrawJobResponseDataDto,
} from "./add-withdraw-job.dto"

@Injectable()
export class AddWithdrawJobService {
    constructor() {}

    async addWithdrawJob(
        {
            tokenInputs,
        }: AddWithdrawJobRequestDto,
    ): Promise<AddWithdrawJobResponseDataDto> {
        // TODO: Implement add withdraw job logic
        console.log(tokenInputs)
        return {
            jobId: "123",
        }
    }
}
