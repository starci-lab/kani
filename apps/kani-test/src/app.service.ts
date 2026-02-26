import {
    Injectable, OnModuleInit 
} from "@nestjs/common"
import {
    SuiClient, 
    getFullnodeUrl, 
    SuiHTTPStatusError 
} from "@mysten/sui/client"
import {
    Transaction 
} from "@mysten/sui/transactions"
import {
    Ed25519Keypair 
} from "@mysten/sui/keypairs/ed25519"

@Injectable()
export class AppService implements OnModuleInit {
    private client: SuiClient
    private keypair: Ed25519Keypair

    constructor() {
        // fullnode mainnet
        this.client = new SuiClient({
            url: getFullnodeUrl("testnet"),
        })

        // TODO: thay bằng keypair thật của bạn (import từ secret key / mnemonic)
        this.keypair = Ed25519Keypair.fromSecretKey("suiprivkey1qz7pmu7t34hmr77f59fj75snpjtky0qkenke0vqkzksf8jvsjmuzg3g62kl")
    }

    async onModuleInit() {
        // gọi thử khi app start để test lỗi
        try {
            await this.transferSuiForTest({
                to: "0x3533f536332929ea96db8903b6d5b608d9b65d05d89f42dcebc2d82ee334b8ac", // sửa để cố tình gây lỗi
                amount: 1_000_000_000_000n,              // 0.001 SUI (nếu thiếu balance sẽ fail)
            })
        } catch (e) {
            if (e instanceof SuiHTTPStatusError) {
                console.log(e)
                console.error(`error is JsonRpcError: ${e.status} - ${e.message}`)
            } else {
                console.log(e)
                console.error(`error is not JsonRpcError: ${e}`)
            }
        }
    }

    /**
     * Hàm transfer SUI đơn giản để test error.
     */
    async transferSuiForTest(params: { to: string; amount: bigint }) {
        const sender = this.keypair.getPublicKey().toSuiAddress()

        const tx = new Transaction()
        tx.setSender(sender)

        // tách từ gas coin rồi transfer (theo ví dụ PTB trong docs)
        // const [coin] = tx.splitCoins(
        //     tx.gas,
        //     [params.amount])
        // tx.transferObjects([coin],
        //     params.to)

        tx.moveCall({
            target: "0x22be4cade64bf2d02412c7e8d0e8beea2f78828b948118d46735315409371a3c::pool::add_deep_price_point",
            typeArguments: ["0x2::sui::SUI",
                "0xf7152c05930480cd740d7311b5b8b45c6f488e3a53a11c3f74a6fac36a52e0d7::DBUSDC::DBUSDC",
                "0x36dbef866a1d62bf7328989a10fb2f07d769f4ee587c0de4a0a256e57e0a58a8::deep::DEEP",
                "0xf7152c05930480cd740d7311b5b8b45c6f488e3a53a11c3f74a6fac36a52e0d7::DBUSDC::DBUSDC"
            ],
            arguments: [tx.object(params.to),
                tx.pure.u64(params.amount)],
        })

        // có thể cố tình set gasBudget nhỏ để test lỗi insufficient gas
        // tx.setGasBudget(1)
        const result = await this.client.signAndExecuteTransaction({
            transaction: tx,
            signer: this.keypair,
            options: {
                showEffects: true,
                showBalanceChanges: true,
                showObjectChanges: true,
            },
        })
        console.log(result)
        return result
    }
}