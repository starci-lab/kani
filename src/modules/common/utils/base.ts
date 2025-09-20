import BN from "bn.js"
import { Types } from "mongoose"
import { v4 } from "uuid"

export const createObjectId = (id: string = v4()): Types.ObjectId => {
    let hex = Buffer.from(id, "utf-8").toString("hex")
    if (hex.length < 24) {
        hex = hex.padStart(24, "0")
    } else if (hex.length > 24) {
        hex = hex.slice(0, 24)
    }
    return new Types.ObjectId(hex)
}

export const waitUntil = async <T>(
    condition: () => T|Promise<T>, 
    timeout: number = 10000
) => {
    const startTime = Date.now()
    while (Date.now() - startTime < timeout) {
        const result = await condition()
        if (result) {        
            return result                  
        }
        await new Promise(resolve => setTimeout(resolve, 100)) 
    }
    return null                      
}
  
export const incrementBnMap = (obj: object, key: string, value: BN) => {
    if (obj[key]) {
        obj[key] = obj[key].add(value)
    } else {
        obj[key] = value
    }
}