import { Entity, ManyToOne, JoinColumn, Column } from "typeorm"
import { UuidAbstractEntity } from "./abstract"
import { AddedLiquidityPoolEntity } from "./added-liquidity-pool.entity"

@Entity({ name: "added_liquidity_pool_histories" })
export class AddedLiquidityPoolHistoryEntity extends UuidAbstractEntity {
    @ManyToOne(() => AddedLiquidityPoolEntity, { onDelete: "CASCADE" })
    @JoinColumn({ name: "added_liquidity_pool_id" })
        addedLiquidityPool: AddedLiquidityPoolEntity

    // amount added previously (snapshot before current operation)
    @Column({ type: "numeric", nullable: true, name: "amount_add_prev" })
        amountAddPrev?: string

    // amount withdrawn in this operation
    @Column({ type: "numeric", nullable: true, name: "amount_withdrawed" })
        amountWithdrawed?: string

    // multiple on-chain transaction hashes for traceability
    @Column({ type: "text", array: true, nullable: true, name: "tx_hashes" })
        txHashes?: Array<string>
}