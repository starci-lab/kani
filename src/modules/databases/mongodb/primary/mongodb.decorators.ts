import { InjectConnection } from "@nestjs/mongoose"
import { CONNECTION_NAME } from "./constants"
// InjectMongoose function to inject the mongoose connection based on options
export const InjectPrimaryMongoose = () => InjectConnection(CONNECTION_NAME)