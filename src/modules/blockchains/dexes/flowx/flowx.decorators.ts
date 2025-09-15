import { Inject } from "@nestjs/common"
import { FLOWX_CLMM_SDKS } from "./flowx.constants"

export const InjectFlowXClmmSdks = () => Inject(FLOWX_CLMM_SDKS)
