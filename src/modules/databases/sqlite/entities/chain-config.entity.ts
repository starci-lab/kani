import { Column, Entity, JoinColumn, ManyToOne } from "typeorm"
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
    // this foreign key is used to link the chain config to the assigned liquidity pool
    // which mean current chain config is used for this assigned liquidity pool
    // if assigned liquidity pool is null, it means this chain config is used for the wallet
    @ManyToOne(
        () => AssignedLiquidityPoolEntity, 
        (assignedLiquidityPool) => assignedLiquidityPool.chainConfigs,
        { nullable: true }
    )
    @JoinColumn({ 
        name: "assigned_liquidity_pool_id"
    })
        assignedLiquidityPool?: AssignedLiquidityPoolEntity

    @Column({ 
        type: "text", 
        name: "assigned_liquidity_pool_id", 
        nullable: true
    })
        assignedLiquidityPoolId?: string
}