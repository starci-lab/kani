import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne } from "typeorm"
import { UuidAbstractEntity } from "./abstract"
import { AssignedLiquidityPoolEntity } from "./assigned-liquidity-pool.entity"
/**
 * LP Position: track full lifecycle (open -> close) with PnL
 */
@Entity({ name: "positions" })
export class PositionEntity extends UuidAbstractEntity {
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

    @Column({ type: "text", name: "close_tx_hash", nullable: true })
        closeTxHash?: string

    @Column({ type: "decimal", precision: 40, scale: 18, name: "roi", nullable: true })
        roi?: string

    @Column({ type: "int", name: "tick_lower" })
        tickLower: number

    @Column({ type: "int", name: "tick_upper" })
        tickUpper: number

    @Column({ type: "text", name: "liquidity" })
        liquidity: string

    @CreateDateColumn({ name: "open_at" })
        openAt: Date
        
    @Column({ name: "close_at", type: "datetime", nullable: true })
        closeAt?: Date

    @Column({ type: "text", name: "position_id" })
        positionId: string
}