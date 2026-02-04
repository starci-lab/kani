import {
    Injectable 
} from "@nestjs/common"
import {
    AddWithdrawJobRequest 
} from "./add-withdraw-job.dto"

@Injectable()
export class AddWithdrawJobService {
    constructor() {}

    async addWithdrawJob(
        {
            tokenInputs,
        }: AddWithdrawJobRequest
    ): Promise<void> {
        // TODO: Implement add withdraw job logic
        console.log(tokenInputs)
    }
}