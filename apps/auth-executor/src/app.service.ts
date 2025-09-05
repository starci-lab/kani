import { Injectable } from "@nestjs/common"
import { AxiosService } from "@modules/axios"

@Injectable()
export class AppService {
    constructor(
      private readonly axiosService: AxiosService
    ) {}
    
    getHello(): string {
        this.axiosService.get("https://api.example.com")
        return "Hello World!"
    }
}
