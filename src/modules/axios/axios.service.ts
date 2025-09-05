import { Injectable } from "@nestjs/common"
import axios, { AxiosInstance, CreateAxiosDefaults } from "axios"

@Injectable()
export class AxiosService {
    private readonly axiosMap: Map<string, AxiosInstance> = new Map()
    
    create(key: string, config?: CreateAxiosDefaults) {
        if (this.axiosMap.has(key)) {
            return this.axiosMap.get(key) as AxiosInstance
        }
        const axiosInstance = axios.create(config)
        this.axiosMap.set(key, axiosInstance)
        return axiosInstance
    } 
}