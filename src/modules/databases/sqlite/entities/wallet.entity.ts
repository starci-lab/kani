import { Column, JoinColumn, Entity, ManyToOne } from "typeorm"
import { UuidAbstractEntity } from "./abstract"
import { UserEntity } from "./user.entity"
import { PlatformId } from "@modules/common"

@Entity({ name: "wallets" })
export class WalletEntity extends UuidAbstractEntity {
    // wallet info
    @ManyToOne(() => UserEntity, (user) => user.wallets, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
        user: UserEntity

    @Column({ type: "text", name: "chain_id" })
        platformId: PlatformId

    @Column({ type: "text", name: "account_address" })
        accountAddress: string

    @Column({ type: "text", name: "encrypted_private_key" })
        encryptedPrivateKey: string    
}