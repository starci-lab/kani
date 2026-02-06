import {
    Injectable 
} from "@nestjs/common"
import {
    InjectPrimaryMongoose, UserSchema 
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import {
    UserNotFoundException 
} from "@modules/exceptions"
import {
    UserJwtLike 
} from "@modules/passport"

@Injectable()
export class UserService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) {}

    async user(
        { id }: UserJwtLike
    ): Promise<UserSchema> {
        const user = await this.connection.model<UserSchema>(UserSchema.name).findById(id)
        if (!user) {
            throw new UserNotFoundException({
                id,
            })
        }
        return user.toJSON()
    }
}

