import { Entity, ManyToOne, JoinColumn, OneToMany, Column, OneToOne } from "typeorm"
import { UuidAbstractEntity } from "./abstract"
import { LiquidityPoolEntity } from "./liquidity-pool.entity"
import { PositionEntity } from "./position.entity"
import { ChainConfigEntity } from "./chain-config.entity"

@Entity({ name: "assigned_liquidity_pools" })
export class AssignedLiquidityPoolEntity extends UuidAbstractEntity {
    @ManyToOne(() => LiquidityPoolEntity, (pool) => pool.assignedLiquidityPools, 
        { onDelete: "CASCADE" }
    )
    @JoinColumn({ name: "liquidity_pool_id" })
        liquidityPool: LiquidityPoolEntity

    @Column({ type: "text", name: "liquidity_pool_id" })
        liquidityPoolId: string

    @OneToMany(() => PositionEntity, (position) => position.assignedLiquidityPool)
        positions: Array<PositionEntity>

    @Column({ type: "text", name: "deposit_amount_limit", nullable: true })
        depositAmountLimit?: string

    @ManyToOne(
        () => ChainConfigEntity, 
        { onDelete: "CASCADE" },
    )
    @JoinColumn({ name: "chain_config_id" })
        chainConfig: ChainConfigEntity

    @Column({ type: "text", name: "chain_config_id" })
        chainConfigId: string

    @OneToOne(
        () => ChainConfigEntity,
        (chainConfig) => chainConfig.providedAssignedLiquidityPool,
        { nullable: true },
    )
        providedChainConfig?: ChainConfigEntity
}