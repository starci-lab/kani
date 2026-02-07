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
    AddWithdrawJobRequestDto,
    AddWithdrawJobResponseDto,
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
    buildExecutorEndpointPath,
    executorRestConfig
} from "@modules/service-configs"

@ApiTags(executorRestConfig().jobs().tags)
@Controller(buildExecutorEndpointPath(
    executorRestConfig().jobs().tags,
    executorRestConfig().jobs().api().addWithdrawJob.path)
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
        type: AddWithdrawJobRequestDto,
        description: "List of tokens and amounts to withdraw.",
    })
    @ApiResponse({
        status: HttpStatus.ACCEPTED,
        description: "Job queued successfully.",
        type: AddWithdrawJobResponseDto,
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: "Invalid request body.",
    })
    async addWithdrawJob(
        @Body() body: AddWithdrawJobRequestDto,
    ) {
        return this.addWithdrawJobService.addWithdrawJob(body)
    }
}
