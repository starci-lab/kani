import {
    Injectable
} from "@nestjs/common"
import dayjs from "dayjs"
import ms from "ms"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
import isSameOrBefore from "dayjs/plugin/isSameOrBefore"
import Decimal from "decimal.js"
import type {
    AlignTimeToIntervalUtcParams
} from "./types"

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(isSameOrBefore)

/**
 * Service for working with dates and times.
 */
@Injectable()
export class DayjsService {
    /**
     * Get the current date and time in UTC.
     * @returns The current date and time in UTC.
     */
    now() {
        return dayjs().utc()
    }

    /**
     * Create a date and time from a string of milliseconds.
     * @param msString - The string of milliseconds.
     * @returns The date and time.
     */
    fromMs(msString: ms.StringValue) {
        return dayjs().utc().add(ms(msString),
            "millisecond")
    }

    /**
     * Create a date and time from a configuration.
     * @param config - The configuration.
     * @returns The date and time.
     */
    from(config: dayjs.ConfigType) {
        return dayjs(config).utc()
    }

    /**
     * Create a date and time from a number of seconds.
     * @param seconds - The number of seconds.
     * @returns The date and time.
     */
    fromSeconds(seconds: number) {
        return dayjs.unix(seconds).utc()
    }

    /**
     * Align a time to an interval boundary in UTC for a given timezone.
     * @param params - The parameters for aligning the time to the interval.
     * @returns The aligned time.
     */
    alignTimeToIntervalUtc(params: AlignTimeToIntervalUtcParams) {
        const { timeZone, intervalMs, time } = params
        const local = dayjs.tz(time.toDate(),
            timeZone)
        const utcOffset = local.utcOffset()
        const nearestValueOfMinusOffset = new Decimal(
            local.add(utcOffset,
                "minute").valueOf(),
        )
            .div(intervalMs)
            .floor()
            .mul(intervalMs)
        return this.from(nearestValueOfMinusOffset.toNumber()).subtract(
            utcOffset,
            "minute",
        )
    }
}
