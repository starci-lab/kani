import { Column, Entity } from "typeorm"
import { StringAbstractEntity } from "./abstract"
import { DexId } from "../../enums"

@Entity({ name: "dexes" })
export class DexEntity extends StringAbstractEntity {
    @Column({ type: "text", name: "display_id", unique: true })
        displayId: DexId

    @Column({ type: "text", name: "name" })
        name: string

    @Column({ type: "text", nullable: true, name: "description" })
        description?: string

    @Column({ type: "text", nullable: true, name: "website" })
        website?: string

    @Column({ type: "text", nullable: true, name: "icon_url" })
        iconUrl?: string
}


