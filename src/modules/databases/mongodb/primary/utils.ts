import {
    getConnectionToken 
} from "@nestjs/mongoose"
import {
    CONNECTION_NAME 
} from "./constants"

export const getPrimaryConnectionToken = () => getConnectionToken(CONNECTION_NAME)