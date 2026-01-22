import {
    Injectable 
} from "@nestjs/common"
import {
    InjectIoRedis 
} from "@modules/native"
import {
    IoRedisInstanceKey 
} from "@modules/native"
import {
    RedisClient 
} from "bullmq"
import {
    createHash 
} from "@modules/utils"
import {
    envConfig 
} from "@modules/env"

const LOCK_AUTHORITY_KEY = "lock-authority"

export interface AcquireParams {
    botId: string,
    jobId: string,
}

export interface ReleaseParams {
    botId: string,
    jobId: string,
}

export interface SendHeartbeatParams {
    botId: string,
    jobId: string,
}

@Injectable()
export class LockAuthorityService {
    constructor(
            @InjectIoRedis(IoRedisInstanceKey.LockAuthority)
            private readonly redisClient: RedisClient
    ) {}

    // acquire the lock authority for the bot
    async acquire(
        {
            botId,
            jobId,
        }: AcquireParams,
    ) {
        // create the key for the lock authority
        const key = createHash(
            LOCK_AUTHORITY_KEY,
            botId,
            jobId,
        )
        // set the lock authority
        const ok = await this.redisClient.set(
            key,
            1,
            "PX",
            envConfig().executor.lockAuthority.ttl,
            "NX"
        )
        // return the result
        return ok === "OK"
    }

    // release the lock authority for the bot
    async release(
        {
            botId,
            jobId,
        }: ReleaseParams,
    ) {
        // create the key for the lock authority
        const key = createHash(
            LOCK_AUTHORITY_KEY,
            botId,
            jobId,
        )
        // delete the lock authority
        const result = await this.redisClient.del(key)
        return result === 1
    }

    // send the heartbeat to the lock authority
    async sendHeartbeat(
        {
            botId,
            jobId,
        }: SendHeartbeatParams,
    ) {
        // create the key for the lock authority
        const key = createHash(
            LOCK_AUTHORITY_KEY,
            botId,
            jobId,
        )
        // create the lua script
        const lua = `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
            return redis.call("PEXPIRE", KEYS[1], ARGV[2])
        end
        return 0
    `
        // evaluate the lua script
        const result = await this.redisClient.eval(
            lua,
            1,
            key,
            1,
            envConfig().executor.lockAuthority.ttl,
        )

        return result === 1
    }
}