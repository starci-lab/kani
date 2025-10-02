import { IoAdapter } from "@nestjs/platform-socket.io"
import { createAdapter } from "@socket.io/redis-adapter"
import { ServerOptions } from "socket.io"
import { envConfig } from "@modules/env"
import { createClient } from "redis"
import { Server } from "socket.io"

export class AuthenticatedRedisIoAdapter extends IoAdapter {
    private adapterConstructor: ReturnType<typeof createAdapter>

    async connectToRedis() {
        // create the client for the publisher
        // temporarily use the createClient instead of createCluster
        // tech-debt: we need to use the createCluster instead of createClient
        const pubClient = createClient({
            url: `redis://${envConfig().redis.host}:${envConfig().redis.port}`,
            password: envConfig().redis.password,
        })
        // duplicate the client for the subscriber
        const subClient = pubClient.duplicate()
        // connect to redis
        await Promise.all([pubClient.connect(), subClient.connect()])
        this.adapterConstructor = createAdapter(pubClient, subClient)
    }

    createIOServer(port: number, options?: ServerOptions) {
        // create the server
        const server: Server = super.createIOServer(port, options)
        // set the adapter
        server.adapter(this.adapterConstructor)
        // return the server
        return server
    }
}