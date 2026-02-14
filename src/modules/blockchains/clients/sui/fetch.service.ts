import {
    Injectable
} from "@nestjs/common"
import {
    RpcExecutorService
} from "../rpc"
import {
    RpcAccessType
} from "@modules/filesystem"
import {
    SuiObjectNotFoundException,
    SuiObjectInvalidTypeException,
} from "@modules/exceptions"
import type {
    FetchSuiObjectParams,
    FetchTransactionBlockParams,
} from "./types"
import {
    AsyncService 
} from "@modules/mixin"
import {
    SuiTransactionBlockResponse 
} from "@mysten/sui/client"

/**
 * Service for fetching a Sui object by ID.
 * Ensures the object exists and is a Move object; throws otherwise. Returns generic object + fields.
 *
 * @example
 * const { object, fields } = await fetchObjectService.fetchObject({
 *   objectId: positionId,
 *   kind: SuiObjectKind.Position,
 *   dexId: DexId.Cetus,
 *   liquidityPoolId: liquidityPool.displayId,
 * })
 * const liquidity = new BN(fields.liquidity)
 */
@Injectable()
export class SuiFetchService {
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly asyncService: AsyncService,
    ) {}

    /**
     * Fetches a Sui object and returns it as a Move object. Throws if not found or not move object.
     */
    async fetchObject<T>({
        objectId,
        kind,
        dexId,
        liquidityPool,
    }: FetchSuiObjectParams): Promise<T> {
        const objectInfo = await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                return await suiClient.getObject({
                    id: objectId,
                    options: {
                        showContent: true,
                    },
                })
            },
        })
        // if object is not found or failed, throw exception
        if (objectInfo.error || !objectInfo.data) {
            throw new SuiObjectNotFoundException({
                kind,
                id: objectId,
                dexId,
                liquidityPoolId: liquidityPool?.displayId,
            })
        }
        // if object is not a move object, throw exception
        if (objectInfo.data.content?.dataType !== "moveObject") {
            throw new SuiObjectInvalidTypeException({
                kind,
                id: objectId,
                dexId,
                liquidityPoolId: liquidityPool?.displayId,
            })
        }
        // return object fields
        const object = objectInfo.data.content.fields as T
        return object
    }

    /**
     * Fetches a Sui transaction block and returns it as a SuiTransactionBlockResponse. Returns null if not found or failed.
     */
    async fetchTransactionBlock(
        {
            txHash,
        }: FetchTransactionBlockParams): Promise<SuiTransactionBlockResponse | null> {
        const [transactionBlock] = await this.asyncService.resolveTuple(
            this.rpcExecutorService.withSuiClient({
                accessType: RpcAccessType.Http,
                callback: async ({ suiClient }) => {
                    return suiClient.getTransactionBlock({
                        digest: txHash,
                        options: {
                            showEffects: true,
                            showEvents: true,
                        },
                    })
                },
            }
            )
        )
        // if transaction block is not found or failed, return null
        if (!transactionBlock || transactionBlock.effects?.status?.status !== "success") {
            return null
        }
        return transactionBlock
    }
}
