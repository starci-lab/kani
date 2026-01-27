import {
    SetMetadata 
} from "@nestjs/common"
import {
    SUCCESS_MESSAGE_METADATA 
} from "./constants"

export const WsSuccessMessage = (message: string) => SetMetadata(SUCCESS_MESSAGE_METADATA,
    message)