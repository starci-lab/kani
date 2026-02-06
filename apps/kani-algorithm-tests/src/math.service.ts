import {
    Injectable, OnApplicationBootstrap 
} from "@nestjs/common"

@Injectable()
export class MathService implements OnApplicationBootstrap {
    constructor() {}

    onApplicationBootstrap() {
        this.testMath()
    }

    private async testMath() {
        console.log("testMath")
    }
}