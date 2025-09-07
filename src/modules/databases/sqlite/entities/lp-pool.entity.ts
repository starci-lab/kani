import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm"
import { AbstractEntity } from "./abstract"
import { Network } from "@modules/common"
import { TokenEntity } from "./token.entity"
import { DexEntity } from "./dex.entity"
import { LpPoolId } from "../../enums"

@Entity({ name: "lp_pools" })
export class LpPoolEntity extends AbstractEntity {
    @Index({ unique: true })
    @Column({ type: "text" })
        displayId: LpPoolId

    @ManyToOne(() => DexEntity)
    @JoinColumn({ name: "dex_id" })
        dex: DexEntity

    @Column({ type: "text" })
        poolAddress: string

    @ManyToOne(() => TokenEntity)
    @JoinColumn({ name: "token_a_id" })
        tokenA: TokenEntity

    @ManyToOne(() => TokenEntity)
    @JoinColumn({ name: "token_b_id" })
        tokenB: TokenEntity

    @Column({ type: "real" })
        fee: number

    @Column({ type: "text" })
        network: Network
}


