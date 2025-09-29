import { Injectable } from "@nestjs/common"
import dayjs from "dayjs"
import { MsService } from "./ms.service"
import ms from "ms"
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