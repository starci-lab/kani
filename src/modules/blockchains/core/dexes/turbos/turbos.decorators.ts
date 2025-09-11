import { Inject } from "@nestjs/common"
import { TURBOS_CLMM_SDKS } from "./turbos.constants"
export const InjectTurbosClmmSdks = () => Inject(TURBOS_CLMM_SDKS)