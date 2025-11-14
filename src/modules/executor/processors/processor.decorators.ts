import { Inject } from "@nestjs/common"
import { PROCESSORS_FACTORY } from "./constants"
import { PROCESSOR_USER } from "./constants"

export const InjectProcessorFactory = () => Inject(PROCESSORS_FACTORY)
export const InjectProcessorUser = () => Inject(PROCESSOR_USER)