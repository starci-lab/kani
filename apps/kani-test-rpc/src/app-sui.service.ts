import {
    MountStorageService 
} from "@modules/filesystem"
import {
    InjectPrivyClient, 
    PrivyWalletService 
} from "@modules/privy"
import {
    SuiClient 
} from "@mysten/sui/client"
import {
    Injectable, OnModuleInit 
} from "@nestjs/common"
import {
    Transaction 
} from "@mysten/sui/transactions"
import {
    messageWithIntent, toSerializedSignature 
} from "@mysten/sui/cryptography"
import {
    publicKeyFromRawBytes, verifyTransactionSignature
} from "@mysten/sui/verify"
import {
    fromBase58, fromHex, toHex 
} from "@mysten/bcs"
import {
    TransactionDataBuilder 
} from "@mysten/sui/transactions"
import {
    PrivyClient 
} from "@privy-io/node"
import {
    Ed25519Keypair 
} from "@mysten/sui/keypairs/ed25519"

@Injectable()
export class AppSuiService implements OnModuleInit{
    constructor(
        private readonly privyWalletService: PrivyWalletService,
        private readonly mountStorageService: MountStorageService,
        @InjectPrivyClient()
        private readonly privyClient: PrivyClient,
    ) {}

    async onModuleInit() {
        const wallet = await this.privyWalletService.fetchWallet("qyfflyzqh55z4z98c48abmy4")
        console.log(wallet)
        const suiClient = new SuiClient(
            {
                network: "mainnet",
                url: "https://fullnode.mainnet.sui.io:443",
            }
        )
        // 3 Create transaction
        const tx = new Transaction()
        tx.setSender("0x9a4f075e8faac7fd8c4ca7084be86a78b97aeb65c1f2c53a5d3a861ef1bff517")
        const [coin] = tx.splitCoins(
            tx.gas, 
            [1_000_000]
        )
        tx.transferObjects([coin],
            "0x9a4f075e8faac7fd8c4ca7084be86a78b97aeb65c1f2c53a5d3a861ef1bff517")
        // serialize the transaction
        const rawBytes = await tx.build({
            client: suiClient 
        })
        console.log(`raw bytes: ${rawBytes}`)
        const intentMessage = messageWithIntent("TransactionData",
            rawBytes)
        const bytes = Buffer.from(intentMessage).toString("hex")
        console.log(`bytes: ${bytes}`)
        const publicKey = publicKeyFromRawBytes("ED25519",
            fromHex(wallet.public_key?.slice(2) ?? ""))
        console.log(`sui address from pubkey: ${publicKey.toSuiAddress()}`)
        // sign the transaction
        const hash = toHex(fromBase58(TransactionDataBuilder.getDigestFromBytes(rawBytes)))
        console.log(`hash: ${hash}`)
        const rawSignature = await this.privyClient.wallets().rawSign(
            wallet.id,
            {
                params: {
                    bytes,
                    encoding: "hex",
                    hash_function: "blake2b256" as "keccak256" | "sha256",
                },
                authorization_context: {
                    authorization_private_keys: [this.mountStorageService.privySignerPrivateKey],
                },
            }
        )
        console.log(`raw signature: ${rawSignature.signature}`)
        // console.log(`digest: ${digest}`)
        // const address = ""
        // const publicKeyRaw = wallet.public_key?.slice(2) ?? ""
        // console.log(publicKeyRaw)
        // const publicKey = publicKeyFromRawBytes("ED25519", fromHex(publicKeyRaw))
        // const signer = this.privyWalletService.createSigner("qyfflyzqh55z4z98c48abmy4")
        // const transactionBytes = await signer.signRawTransaction({
        //     transactionBytes: toHex(fromBase58(digest)),
        //     encoding: "hex",
        //     hashFunction: "sha256",
        //     authorizationContext: {
        //         authorization_private_keys: [this.mountStorageService.privySignerPrivateKey],
        //     },
        // })
        const txSignature = toSerializedSignature({
            signature: fromHex(rawSignature.signature),
            signatureScheme: "ED25519",
            publicKey
        })
        console.log(`txSignature: ${txSignature}`)
        const testSigner = new Ed25519Keypair()
        // sign the transaction
        const signedTransaction = await testSigner.signTransaction(rawBytes)
        console.log(`signed transaction: ${signedTransaction.bytes}`)
        const verified = await verifyTransactionSignature(rawBytes,
            txSignature,
            {
                address: publicKey.toSuiAddress()
            })
        console.log(verified)
    }
}