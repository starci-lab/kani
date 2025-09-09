import { Injectable } from "@nestjs/common"
import { IMetadataService, Metadata } from "../../interfaces"
import { ChainId } from "@modules/common"

@Injectable()
export class TurbosMetadataService implements IMetadataService {
    metadata(): Metadata {
        return {
            chainId: ChainId.Sui
        }
    }
}