import { InjectConnection } from "@nestjs/mongoose"
import { PRIMARY_DATABASE_NAME } from "./constants"
// InjectMongoose function to inject the mongoose connection based on options
export const InjectPrimaryMongoose = () => InjectConnection(PRIMARY_DATABASE_NAME)