import { Column, JoinColumn, Entity, OneToOne } from "typeorm"
import { UuidAbstractEntity } from "./abstract"
import { UserEntity } from "./user.entity"
import { WalletType } from "@modules/databases/enums"

@Entity({ name: "wallets" })
export class WalletEntity extends UuidAbstractEntity {
    // wallet info
    @OneToOne(() => UserEntity, (user) => user.wallets, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
        user: UserEntity

    @Column({ type: "enum", enum: WalletType })
        type: WalletType

    @Column({ type: "text", name: "account_address" })
        accountAddress: string

    @Column({ type: "text", name: "encrypted_private_key", nullable: true })
        encryptedPrivateKey?: string    
}