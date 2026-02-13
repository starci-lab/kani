import {
    Injectable
} from "@nestjs/common"
import {
    RpcExecutorService
} from "@modules/blockchains"
import {
    RpcAccessType
} from "@modules/filesystem"
import {
    SuiObjectNotFoundException,
    SuiObjectInvalidTypeException,
} from "@modules/exceptions"
import type {
    FetchSuiObjectParams,
} from "./types"

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
export class SuiFetchObjectService {
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
    ) {}

    /**
     * Fetches a Sui object and returns it as a Move object. Throws if not found or not move object.
     */
    async fetchObject<T>({
        objectId,
        kind,
        dexId,
        liquidityPoolId,
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

        if (objectInfo.error || !objectInfo.data) {
            throw new SuiObjectNotFoundException({
                kind,
                id: objectId,
                dexId,
                liquidityPoolId,
            })
        }

        if (objectInfo.data.content?.dataType !== "moveObject") {
            throw new SuiObjectInvalidTypeException({
                kind,
                id: objectId,
                dexId,
                liquidityPoolId,
            })
        }

        const object = objectInfo.data.content.fields as T
        return object
    }
}
