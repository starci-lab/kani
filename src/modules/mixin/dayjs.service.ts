import { Injectable } from "@nestjs/common"
import dayjs from "dayjs"

@Injectable()
export class DayjsService {
    constructor() {}

    now() {
        return dayjs()
    } 
}