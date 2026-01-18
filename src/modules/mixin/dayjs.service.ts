import {
    Injectable 
} from "@nestjs/common"
import dayjs from "dayjs"
import ms from "ms"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
import isSameOrBefore from "dayjs/plugin/isSameOrBefore"
import Decimal from "decimal.js"

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(isSameOrBefore)

@Injectable()
export class DayjsService {
    now() {
        return dayjs().utc()
    } 

    fromMs(msString: ms.StringValue) {
        return dayjs().utc().add(ms(msString),
            "millisecond")
    }

    from(config: dayjs.ConfigType) {
        return dayjs(config).utc()
    }

    getNearestBucketUTC(
        date: Date,
        intervalMs: number,
        timeZone: string
    ) {
        // 1. Apply timezone
        const local = this.from(date).tz(timeZone)
        // 2. calculate the bucket date according to the local time
        const utcOffset = local.utcOffset()
        // 3. calculate the nearest value of the minus offset
        const nearestValueOfMinusOffset = new Decimal(local.add(utcOffset,
            "minute")
            .valueOf())
            .div(intervalMs)
            .floor()
            .mul(intervalMs)
        // 4. return the nearest bucket date
        return this.from(nearestValueOfMinusOffset.toNumber()).subtract(utcOffset,
            "minute")
    }
}