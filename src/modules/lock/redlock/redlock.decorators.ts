import { Inject } from "@nestjs/common"
import { REDLOCK } from "./constants"

export const InjectRedlock = () => Inject(REDLOCK)