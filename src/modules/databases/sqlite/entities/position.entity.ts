import { Column, Entity, JoinColumn, ManyToOne } from "typeorm"
import { StringAbstractEntity } from "./abstract"
import { AssignedLiquidityPoolEntity } from "./assigned-liquidity-pool.entity"
/**
 * LP Position: track full lifecycle (open -> close) with PnL
 */
@Entity({ name: "positions" })
export class PositionEntity extends StringAbstractEntity {
    @ManyToOne(() => AssignedLiquidityPoolEntity, 
        (assignedLiquidityPool) => assignedLiquidityPool.positions, 
        { onDelete: "CASCADE" }
    )
    @JoinColumn({ name: "liquidity_pool_id" })
        pool: AssignedLiquidityPoolEntity

    // When opening position
    @Column({ type: "decimal", precision: 40, scale: 18, name: "amount_open" })
        amountOpen: string

    @Column({ type: "decimal", precision: 40, scale: 18, name: "amount_close", nullable: true })
        amountClose?: string

    @Column({ type: "text", name: "open_tx_hash" })
        openTxHash: string

    @Column({ type: "bigint", name: "open_block_number" })
        openBlockNumber: string

    @Column({ type: "text", name: "close_tx_hash", nullable: true })
        closeTxHash?: string

    @Column({ type: "bigint", name: "close_block_number", nullable: true })
        closeBlockNumber?: string

    @Column({ type: "decimal", precision: 40, scale: 18, name: "roi", nullable: true })
        roi?: string
}