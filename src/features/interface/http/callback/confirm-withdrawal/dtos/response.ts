import {
    AbstractRestResponse, IAbstractRestResponse 
} from "@modules/api"


/** DTO for confirm withdrawal REST response. */
export class ConfirmWithdrawalResponseDto
    extends AbstractRestResponse<undefined>
    implements IAbstractRestResponse {
}
