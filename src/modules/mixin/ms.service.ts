import { Injectable } from "@nestjs/common"
import ms from "ms"

@Injectable()
export class MsService {
    constructor() {}

    fromString(msString: ms.StringValue) {
        return ms(msString)
    }
}