import {
    INFLUXDB_PRIMARY
} from "./constants"
import {
    Inject 
} from "@nestjs/common"
// InjectMongoose function to inject the mongoose connection based on options
export const InjectPrimaryInfluxdb = () => Inject(INFLUXDB_PRIMARY)