import { Column, Entity, ManyToOne, OneToMany, OneToOne, RelationId, JoinColumn } from "typeorm"
import { UuidAbstractEntity } from "./abstract"
import { ChainId, Network, TokenType } from "@modules/common"
import { WalletEntity } from "./wallet.entity"
import { AssignedLiquidityPoolEntity } from "./assigned-liquidity-pool.entity"

@Entity({ name: "chain_configs" })
export class ChainConfigEntity extends UuidAbstractEntity {
    @Column({ type: "text", name: "chain_id" })
        chainId: ChainId

    @Column({ type: "text", name: "network" })
        network: Network

    @Column({ type: "text", name: "farm_token_type" })
        farmTokenType: TokenType.StableUsdc

    @ManyToOne(() => WalletEntity, (wallet) => wallet.chainConfigs)
    @JoinColumn({ name: "wallet_id" })
        wallet: WalletEntity

    @Column({ type: "text", name: "wallet_id", nullable: true })
        walletId: string
    // this one to many is used to link the chain config to the assigned liquidity pools
    @OneToMany(
        () => AssignedLiquidityPoolEntity, 
        (assignedLiquidityPool) => assignedLiquidityPool.chainConfig,
    )
        assignedLiquidityPools: Array<AssignedLiquidityPoolEntity>

    @RelationId((chainConfig: ChainConfigEntity) => chainConfig.assignedLiquidityPools)
        assignedLiquidityPoolIds: Array<string>

    @OneToOne(
        () => AssignedLiquidityPoolEntity,
        (assignedLiquidityPool) => assignedLiquidityPool.chainConfig,
        { nullable: true },
    )
    @JoinColumn({ name: "provided_assigned_liquidity_pool_id" })
        providedAssignedLiquidityPool?: AssignedLiquidityPoolEntity

    @Column({ type: "text", name: "provided_assigned_liquidity_pool_id", nullable: true })
        providedAssignedLiquidityPoolId?: string
}