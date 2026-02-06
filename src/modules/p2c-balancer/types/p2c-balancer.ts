import type {
    ChainId
} from "@modules/typedefs"
import type {
    RpcAccessConfig,
    RpcAccessType
} from "@modules/filesystem"
import type {
    P2cBalancer
} from "load-balancers"

/** Params for selecting an RPC. */
export interface BalanceParams {
    chainId: ChainId
    accessType: RpcAccessType
}

/** P2C balancer data holder (instance + expanded-by-weight configs). */
export interface P2CBalancerData {
    instance: P2cBalancer
    rpcAccessConfigs: Array<RpcAccessConfig>
}
