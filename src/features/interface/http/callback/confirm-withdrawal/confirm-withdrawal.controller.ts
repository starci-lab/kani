
import {
    UseInterceptors, Post, Controller,
    HttpStatus,
    HttpCode
} from "@nestjs/common"
import {
    Body
} from "@nestjs/common"
import {
    ConfirmWithdrawalResponseDto,
    ConfirmWithdrawalRequestDto,
} from "./dtos"
import {
    RestSuccessMessage, RestTransformInterceptor
} from "@modules/api"
import {
    ConfirmWithdrawalService,
} from "./confirm-withdrawal.service"
import {
    ApiBody, ApiOperation, ApiResponse,
    ApiTags
} from "@nestjs/swagger"
import {
    buildInterfaceEndpointPath,
    interfaceRestConfig
} from "@modules/service-configs"

@ApiTags(interfaceRestConfig().callback().tags)
@Controller(buildInterfaceEndpointPath(
    interfaceRestConfig().callback().tags,
    interfaceRestConfig().callback().api().confirmWithdrawal.path
)
)
export class ConfirmWithdrawalController {
    constructor(
        private readonly confirmWithdrawalService: ConfirmWithdrawalService,
    ) { }

    @RestSuccessMessage("Withdrawal confirmed successfully")
    @Post()
    @UseInterceptors(RestTransformInterceptor)
    @HttpCode(HttpStatus.ACCEPTED)
    @ApiOperation({
        summary: "Confirm withdrawal",
        description: "Confirm a withdrawal for the given transaction hashes and received tokens.",
    })
    @ApiBody({
        type: ConfirmWithdrawalRequestDto,
        description: "Transaction hashes and received tokens to confirm.",
    })
    @ApiResponse({
        status: HttpStatus.ACCEPTED,
        description: "Withdrawal confirmed successfully.",
        type: ConfirmWithdrawalResponseDto,
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: "Invalid request body.",
    })
    async confirmWithdrawal(
        @Body() body: ConfirmWithdrawalRequestDto,
    ) {
        return this.confirmWithdrawalService.confirmWithdrawal(body)
    }
}

