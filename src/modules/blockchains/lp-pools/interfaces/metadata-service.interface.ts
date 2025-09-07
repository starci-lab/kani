import { ChainId } from "@modules/common"

export interface Metadata {
    // supported chain id
    chainId: ChainId
}

export interface IMetadataService {
    metadata: () => Metadata
}