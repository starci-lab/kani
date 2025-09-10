import { Column, Entity, ManyToOne } from "typeorm"
import { UuidAbstractEntity } from "./abstract"
import { ChainId, Network, TokenType } from "@modules/common"
import { WalletEntity } from "./wallet.entity"

@Entity({ name: "chain_configs" })
export class ChainConfigEntity extends UuidAbstractEntity {
    @Column({ type: "text", name: "chain_id" })
        chainId: ChainId

    @Column({ type: "text", name: "network" })
        network: Network

    @Column({ type: "text", name: "farm_token_type" })
        farmTokenType: TokenType.StableUsdc

    @ManyToOne(() => WalletEntity, (wallet) => wallet.chainConfigs)
        wallet: WalletEntity

}