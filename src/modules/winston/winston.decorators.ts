import { Inject } from "@nestjs/common"
import { WINSTON_MODULE_PROVIDER } from "nest-winston"

export const InjectWinston = () => Inject(WINSTON_MODULE_PROVIDER)