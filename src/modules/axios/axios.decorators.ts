import { Inject } from "@nestjs/common"
import { AXIOS_INSTANCE_TOKEN } from "./axios.constants"

export const InjectAxios = () => Inject(AXIOS_INSTANCE_TOKEN)