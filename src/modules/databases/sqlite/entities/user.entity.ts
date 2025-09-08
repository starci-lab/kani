import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm"
import { UuidAbstractEntity } from "./abstract"
import { UserDepositEntity } from "./user-deposit.entity"
import { UserCummulativeEntity } from "./user-cummulative.entity"
import { TokenEntity } from "./token.entity"
import { TokenId } from "@modules/databases"

@Entity({ name: "users" })
export class UserEntity extends UuidAbstractEntity {
    @OneToMany(() => UserDepositEntity, (deposit) => deposit.user)
        deposits: Array<UserDepositEntity>

    @OneToMany(() => UserCummulativeEntity, (cum) => cum.allocation)
        cummulatives: Array<UserCummulativeEntity>

    @ManyToOne(() => TokenEntity, { nullable: true })
    @JoinColumn({ name: "priority_token_id" })
        priorityToken?: TokenEntity

    @Column({ type: "text", nullable: true, name: "priority_token_id" })
        priorityTokenId?: TokenId

    @Column({ type: "boolean", default: false, name: "exit_to_usdc" })
        exitToUsdc: boolean

    @Column({ type: "text", nullable: true, name: "sui_wallet_account_address" })
        suiWalletAccountAddress?: string

    @Column({ type: "text", nullable: true, name: "sui_wallet_encrypted_private_key" })
        suiWalletEncryptedPrivateKey?: string

    @Column({ type: "text", nullable: true, name: "evm_wallet_account_address" })
        evmWalletAccountAddress?: string

    @Column({ type: "text", nullable: true, name: "evm_wallet_encrypted_private_key" })
        evmWalletEncryptedPrivateKey?: string

    @Column({ type: "text", nullable: true, name: "solana_wallet_account_address" })
        solanaWalletAccountAddress?: string

    @Column({ type: "text", nullable: true, name: "solana_wallet_encrypted_private_key" })
        solanaWalletEncryptedPrivateKey?: string

    @Column({ type: "boolean", default: true, name: "is_active" })
        isActive: boolean
}


