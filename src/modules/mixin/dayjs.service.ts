import { Injectable } from "@nestjs/common"
import dayjs from "dayjs"
import { MsService } from "./ms.service"
import ms from "ms"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"

dayjs.extend(utc)
dayjs.extend(timezone)

@Injectable()
export class DayjsService {
    constructor(
        private readonly msService: MsService
    ) {}

    now() {
        return dayjs()
    } 

    fromMs(msString: ms.StringValue) {
        return dayjs().add(this.msService.fromString(msString), "millisecond")
    }
}