import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm"
import { UuidAbstractEntity } from "./abstract"
import { TokenEntity } from "./token.entity"
import { UserDepositEntity } from "./user-deposit.entity"
import { UserCummulativeEntity } from "./user-cummulative.entity"
import { UserEntity } from "./user.entity"

@Entity({ name: "user_allocations" })
export class UserAllocationEntity extends UuidAbstractEntity {
        @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
        @JoinColumn({ name: "user_id" })
            user: UserEntity

        @OneToMany(() => UserDepositEntity, (deposit) => deposit.allocation)
            deposits: Array<UserDepositEntity>

        @OneToMany(() => UserCummulativeEntity, (cum) => cum.allocation)
            cummulatives: Array<UserCummulativeEntity>

        @ManyToOne(() => TokenEntity, { nullable: true })
        @JoinColumn({ name: "priority_token_id" })
            priorityToken?: TokenEntity

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
}