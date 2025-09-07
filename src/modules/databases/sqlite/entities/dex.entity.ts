import { Column, Entity, Index } from "typeorm"
import { StringAbstractEntity } from "./abstract"
import { DexId } from "../../enums"

@Entity({ name: "dexes" })
export class DexEntity extends StringAbstractEntity {
    @Index({ unique: true })
    @Column({ type: "text" })
        displayId: DexId

    @Column({ type: "text" })
        name: string

    @Column({ type: "text", nullable: true })
        description?: string

    @Column({ type: "text", nullable: true })
        website?: string

    @Column({ type: "text", nullable: true })
        iconUrl?: string
}


