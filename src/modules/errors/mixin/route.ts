import { InternalServerErrorException } from "@nestjs/common"

export class DestinationUrlNotFoundException extends InternalServerErrorException {
    constructor() {
        super("Destination URL not found in request")
    }
}