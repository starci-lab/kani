import { ORCA_CLMM_SDKS } from "./constants"
import { Inject } from "@nestjs/common"

export const InjectOrcaClmmSdks = () => Inject(ORCA_CLMM_SDKS)