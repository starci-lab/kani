import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Post,
    UseInterceptors,
} from "@nestjs/common"
import {
    ApiBody,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger"
import {
    AddWithdrawJobRequest,
    AddWithdrawJobResponseDataDto,
} from "./add-withdraw-job.dto"
import {
    AddWithdrawJobService,
} from "./add-withdraw-job.service"
import {
    RestTransformInterceptor 
} from "@modules/api"
import {
    RestSuccessMessage 
} from "@modules/api"
import {
    buildEndpointPath,
    restConfig 
} from "../config"

@ApiTags(restConfig().jobs().tags)
@Controller(buildEndpointPath(
    restConfig().jobs().tags,
    restConfig().jobs().api().addWithdrawJob.path)
)
export class AddWithdrawJobController {
    constructor(
        private readonly addWithdrawJobService: AddWithdrawJobService,
    ) {}

    @RestSuccessMessage("Withdraw job queued")
    @Post()
    @UseInterceptors(RestTransformInterceptor)
    @HttpCode(HttpStatus.ACCEPTED)
    @ApiOperation({
        summary: "Add withdraw job",
        description: "Queue a withdraw job for the given tokens and amounts.",
    })
    @ApiBody({
        type: AddWithdrawJobRequest,
        description: "List of tokens and amounts to withdraw.",
    })
    @ApiResponse({
        status: HttpStatus.ACCEPTED,
        description: "Job queued successfully.",
        type: AddWithdrawJobResponseDataDto,
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: "Invalid request body.",
    })
    async addWithdrawJob(
        @Body() body: AddWithdrawJobRequest,
    ): Promise<AddWithdrawJobResponseDataDto> {
        return this.addWithdrawJobService.addWithdrawJob(body)
    }
}
