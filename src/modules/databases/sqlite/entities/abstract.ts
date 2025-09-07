import { CreateDateColumn, PrimaryColumn, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm"

export abstract class AbstractEntity {
    @CreateDateColumn({ name: "created_at" })
        createdAt: Date

    @UpdateDateColumn({ name: "updated_at" })
        updatedAt: Date
}

export abstract class StringAbstractEntity extends AbstractEntity {
    @PrimaryColumn({ type: "text" })
        id: string
}

export abstract class UuidAbstractEntity extends AbstractEntity {
    @PrimaryGeneratedColumn("uuid")
        id: string
}
