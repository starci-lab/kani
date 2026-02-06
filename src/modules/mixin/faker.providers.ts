import {
    Inject,
    Provider
} from "@nestjs/common"
import {
    Faker,
    faker
} from "@faker-js/faker"
import {
    FAKER
} from "./constants"

export const InjectFaker = () => Inject(FAKER)

export const createFakerServiceProvider = (): Provider<Faker> => ({
    provide: FAKER,
    useFactory: () => {
        return faker
    },
})