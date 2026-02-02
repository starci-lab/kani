import {
    createAdapter 
} from "@socket.io/redis-adapter"

import {
    ServerOptions 
} from "http"
import {
    RedisOrCluster 
} from "@modules/native"
import {
    IoAdapter 
} from "@nestjs/platform-socket.io"

export class RedisIoAdapter extends IoAdapter {
    private adapterConstructor: ReturnType<typeof createAdapter>
    private redisClientOrCluster: RedisOrCluster

    public setClient(redisClientOrCluster: RedisOrCluster) {
        this.redisClientOrCluster = redisClientOrCluster
    }

    public async connect(): Promise<void> {
        // if cluster is enabled,
        const pubClient = this.redisClientOrCluster.duplicate()
        const subClient = this.redisClientOrCluster.duplicate() 
        this.adapterConstructor = createAdapter(pubClient,
            subClient)
    }

    public createIOServer(port: number, options?: ServerOptions) {
        const server = super.createIOServer(port,
            options)
        server.adapter(this.adapterConstructor)
        
        return server
    }
}