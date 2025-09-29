import { BadRequestException } from "@nestjs/common"

export class DestinationUrlNotFoundException extends BadRequestException {
    constructor() {
        super("Destination URL not found in request")
        this.name = "DESTINATION_URL_NOT_FOUND_EXCEPTION"
    }
}