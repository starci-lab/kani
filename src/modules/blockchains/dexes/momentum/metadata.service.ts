import { Injectable } from "@nestjs/common"
import { IMetadataService, Metadata } from "../../interfaces"
import { ChainId } from "@modules/common"

@Injectable()
export class MomentumMetadataService implements IMetadataService {
    metadata(): Metadata {
        return {
            chainId: ChainId.Sui
        }
    }
}