import {
    Injectable,
    OnApplicationBootstrap
} from "@nestjs/common"
import {
    InjectIoRedis,
    RedisOrCluster
} from "@modules/native"
import {
    IoRedisInstanceKey
} from "@modules/native"
import {
    envConfig
} from "@modules/env"
import {
    DayjsService
} from "@modules/mixin"
import {
    Interval
} from "@nestjs/schedule"
import {
    EventEmitterService, 
    EventName
} from "@modules/event"
import {
    WinstonLog, WinstonService 
} from "@modules/winston"
import {
    sleep 
} from "@modules/common"
import type {
    AcquireParams,
    ReleaseParams,
    SendHeartbeatParams,
} from "./types"

const LOCK_AUTHORITY_KEY = "lock-authority"

/**
 * Redis-backed lock authority service for bots.
 * Ensures only ONE executor instance owns the authority to run side-effecting work for a bot.
 *
 * @example
 * const acquired = await lockAuthorityService.acquire({ botId: "..." })
 */
@Injectable()
export class LockAuthorityService implements OnApplicationBootstrap {
    constructor(
        @InjectIoRedis(IoRedisInstanceKey.LockAuthority)
        private readonly redisClient: RedisOrCluster,
        private readonly dayjsService: DayjsService,
        private readonly eventEmitterService: EventEmitterService,
        private readonly winstonService: WinstonService,
    ) { }

    onApplicationBootstrap() {
        this.notifyExpiredLocks()
    }

    /**
     * Returns the scheduler ZSET key for this executor instance.
     *
     * ZSET members are lock keys, score is their `expireAt` timestamp in ms.
     */
    private getLockSchedulerKey() {
        return `${LOCK_AUTHORITY_KEY}:{${envConfig().executor.id}}:scheduler`
    }

    /**
     * Returns the lock key for the given bot for this executor instance.
     *
     * The lock key itself stores a simple value (currently `1`) with a TTL.
     */
    private getLockKey(botId: string) {
        return `${LOCK_AUTHORITY_KEY}:{${envConfig().executor.id}}:${botId}`
    }

    /**
     * Returns the bot ID from the lock key.
     */
    private getBotId(lockKey: string) {
        return lockKey.split(":")[2]
    }

    /**
     * Periodically scans the scheduler ZSET for expired locks (score <= now).
     *
     * Current behavior:
     * - Reads expired lock keys from the scheduler ZSET.
     * - Logs them (debug).
     *
     * Intended flow (future):
     * - For each expired lock key:
     *   - delete the lock key (if still present)
     *   - remove it from the scheduler ZSET
     *   - optionally emit metrics/logs for observability
     */
    @Interval(envConfig().executor.lockAuthority.interval.notifyExpiredLocks)
    async notifyExpiredLocks() {
        try {
            const now = this.dayjsService.now()

            const lua = `
        local expiredKeys = redis.call(
            "ZRANGEBYSCORE",
            KEYS[1],
            "-inf",
            ARGV[1]
        )

        for _, lockKey in ipairs(expiredKeys) do
            redis.call("DEL", lockKey)
            redis.call("ZREM", KEYS[1], lockKey)
        end

        return expiredKeys
    `
            // evaluate the lua script to get the expired locks
            const expiredLocks = await this.redisClient.eval(
                lua,
                1,                              // number of KEYS
                this.getLockSchedulerKey(),     // KEYS[1]
                now.valueOf()                   // ARGV[1]
            ) as Array<string>
            // get the bot IDs from the expired locks
            const botIds = expiredLocks.map(this.getBotId)
            // broadcast the expired locks to the event emitter
            for (const botId of botIds) {
                this.eventEmitterService.emit(
                    {
                        event: EventName.LockAuthorityTimeout,
                        payload: {
                            botId 
                        },
                    }
                )
            }
        } catch (error) {
            this.winstonService.log(
                WinstonLog.LockAuthorityNotifyExpiredLocksFailed,
                {
                    error: error.message,
                }
            )
            throw error
        }
        
    }

    /**
     * Acquire lock authority for a bot.
     *
     * @param params - Acquire params (botId)
     * @returns true if lock was acquired, false if lock already existed
     *
     * @example
     * const acquired = await lockAuthorityService.acquire({ botId: "..." })
     */
    async acquire(
        {
            botId,
        }: AcquireParams,
    ) {

        // create the key for the lock authority
        const key = this.getLockKey(botId)
        const lockSchedulerKey = this.getLockSchedulerKey()
        try {
            const ttl = envConfig().executor.lockAuthority.ttl
            const now = this.dayjsService.now()
            const expireAt = now.add(ttl,
                "millisecond").valueOf()

            /**
         * Lua script logic (atomic):
         *
         * KEYS[1] -> lock key
         * KEYS[2] -> scheduler ZSET key
         *
         * ARGV[1] -> lock value (fixed to 1, boolean-style lock)
         * ARGV[2] -> TTL in milliseconds
         * ARGV[3] -> expireAt timestamp (ms) for ZSET score
         *
         * Flow:
         * 1) Try to SET lock key with NX + PX
         * 2) If successful:
         *    - Register the lock into scheduler ZSET
         *    - Return 1
         * 3) If failed (lock already exists):
         *    - Return 0
         */
            const lua = `
   if redis.call("SET", KEYS[1], ARGV[1], "PX", ARGV[2], "NX") then
       redis.call("ZADD", KEYS[2], ARGV[3], KEYS[1])
       return 1
   end
   return 0
`
            const ok = await this.redisClient.eval(
                lua,
                2,                              // Number of KEYS
                key,                            // KEYS[1]: lock key
                lockSchedulerKey,               // KEYS[2]: scheduler ZSET key
                1,                              // ARGV[1]: lock value (boolean = 1)
                ttl,                            // ARGV[2]: TTL (ms)
                expireAt                        // ARGV[3]: expire timestamp (ms)
            )
            return ok === 1
        } catch (error) {
            this.winstonService.log(
                WinstonLog.LockAuthorityAcquireFailed,
                {
                    botId,
                    key,
                    lockSchedulerKey,
                    error: error.message,
                }
            )
            throw error
        }
    }

    /**
     * Release lock authority for a bot.
     *
     * @param params - Release params (botId)
     * @returns true if lock existed and was removed, false if no lock existed
     *
     * @example
     * await lockAuthorityService.release({ botId: "..." })
     */
    async release({ botId }: ReleaseParams): Promise<boolean> {
        await sleep(100) // 0.1s to release the lock to avoid race condition
        // create the key for the lock authority
        const key = this.getLockKey(botId)
        const lockSchedulerKey = this.getLockSchedulerKey()
        try {
        /**
         * Lua logic (atomic):
         * - Delete lock key
         * - Remove it from scheduler ZSET
         * - Return 1 if lock existed, otherwise 0
         *
         * KEYS[1] -> lock key
         * KEYS[2] -> scheduler ZSET key
         */
            const lua = `
        if redis.call("DEL", KEYS[1]) == 1 then
            redis.call("ZREM", KEYS[2], KEYS[1])
            return 1
        end
        return 0
    `
            const result = await this.redisClient.eval(
                lua,
                2,
                key,                            // KEYS[1]: lock key
                lockSchedulerKey,               // KEYS[2]: scheduler ZSET key
            )
            return result === 1
        } catch (error) {
            this.winstonService.log(
                WinstonLog.LockAuthorityReleaseFailed,
                {
                    botId,
                    key,
                    lockSchedulerKey,
                    error: error.message,
                }
            )
            throw error
        }
    }

    /**
     * Refresh (heartbeat) the lock authority for a bot.
     *
     * @param params - Send heartbeat params (botId)
     * @returns true if lock was refreshed, false if authority is lost
     *
     * @example
     * const ok = await lockAuthorityService.sendHeartbeat({ botId: "..." })
     */
    async sendHeartbeat({ botId }: SendHeartbeatParams): Promise<boolean> {
    // create the key for the lock authority
        const key = this.getLockKey(botId)
        const lockSchedulerKey = this.getLockSchedulerKey()
        try {
            const ttl = envConfig().executor.lockAuthority.ttl
            const expireAt = this.dayjsService
                .now()
                .add(ttl,
                    "millisecond")
                .valueOf()

            /**
         * Lua logic (atomic):
         * - Check lock exists AND value == 1
         * - Extend TTL
         * - Update scheduler ZSET expire time
         *
         * KEYS[1] -> lock key
         * KEYS[2] -> scheduler ZSET key
         *
         * ARGV[1] -> expected lock value (1)
         * ARGV[2] -> TTL in ms
         * ARGV[3] -> new expireAt timestamp (ms)
         */
            const lua = `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
            redis.call("PEXPIRE", KEYS[1], ARGV[2])
            redis.call("ZADD", KEYS[2], ARGV[3], KEYS[1])
            return 1
        end
        return 0
    `

            const result = await this.redisClient.eval(
                lua,
                2,
                key,                            // KEYS[1]: lock key
                lockSchedulerKey,               // KEYS[2]: scheduler ZSET
                1,                              // ARGV[1]: expected lock value
                ttl,                            // ARGV[2]: TTL (ms)
                expireAt                        // ARGV[3]: new expireAt
            )

            return result === 1
        } catch (error) {
            this.winstonService.log(
                WinstonLog.LockAuthoritySendHeartbeatFailed,
                {
                    botId,
                    key,
                    lockSchedulerKey,
                    error: error.message,
                }
            )
            throw error
        }
    }
}