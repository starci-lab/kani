<p align="center">
  <img src="https://r2.starci.net/protocols/solana.png" width="96" alt="Kani" />
</p>

<h2 align="center">Kani — Automated Liquidity Bot for Ultra‑Thin CLMM Ranges</h2>

<p align="center">
Amplify capital with ultra‑thin ranges and a smart exit engine powered by CEX + oracle insights. Originally built on Sui, now shifting to Solana for latency and scale.
</p>

---

### Nội dung
- Giới thiệu nhanh
- Kiến trúc & định hướng (Sui → Solana)
- Cấu trúc mã nguồn (monorepo)
- Cài đặt & chạy nhanh
- Cấu hình môi trường
- Roadmap (Solana)
- Tài liệu liên quan

### Giới thiệu nhanh
Kani là một liquidity bot tự động hóa việc mở/duy trì các vị thế CLMM với phạm vi siêu mỏng (ultra‑thin), tối đa hóa APR như một dạng đòn bẩy tự nhiên. Bot sử dụng dữ liệu đa nguồn (CEX, oracle, on‑chain) để phát hiện tín hiệu bất thường và thoát vị thế trước khi giá DEX bị điều chỉnh.

Điểm khác biệt:
- Ultra‑thin ranges được cập nhật với độ trễ thấp.
- Pool scoring theo thanh khoản, biến động, độ ổn định yield.
- Risk module kích hoạt thoát/hedge dựa trên tín hiệu đa nguồn (CEX lead, oracle delta, swap pressure).

### Kiến trúc & định hướng
- Kani khởi đầu trên Sui (đã có adapters: Cetus, Turbos, Momentum, FlowX).
- Đang dịch chuyển sang Solana để tận dụng TPS cao, latency thấp và hệ sinh thái CLMM phong phú (Raydium, Orca, Meteora).
- Mô hình module hóa: mỗi DEX là một adapter riêng (fetch/metadata/action) và được wiring động qua `DexesModule` + `LiquidityPoolService`.

Tham khảo chi tiết tại: `app/ARCHITECTURE.md`.

### Cấu trúc mã nguồn (monorepo)
Các thư mục đáng chú ý dưới `app/`:
- `src/modules/blockchains/dexes/`: Adapters cho DEX (Sui và Solana).
  - Đã có: `cetus/`, `turbos/`, `momentum/`, `flowx/` (Sui)
  - Mới (Solana, scaffold): `raydium/`, `orca/`, `meteora/`
- `src/modules/blockchains/dexes/dexes.module.ts`: Đăng ký động các DEX theo `DexId`.
- `src/modules/blockchains/dexes/liquidity-pool.service.ts`: Trả về danh sách adapter theo `chainId` (Sui/Solana).
- `src/modules/databases/enums/ids.ts`: Khai báo `DexId`, `ChainId`, và các enum liên quan.
- `src/modules/env/config.ts`: Cấu hình runtime (DB, RPC, Redis, v.v.).

### Cài đặt & chạy nhanh
Yêu cầu: Node.js 18+, pnpm/npm, MongoDB/SQLite (tùy cấu hình), Redis (nếu bật queue), RPC endpoints (Sui/Solana).

```bash
# Cài dependencies (trong thư mục app/)
npm install

# Development
npm run start:dev

# Build + Production
npm run build
npm run start:prod

# Lint & Test
npm run lint
npm run test
npm run test:e2e
```

Chạy dịch vụ cụ thể (ví dụ các app con trong `app/apps/*`) có thể cấu hình qua Nest CLI hoặc script riêng nếu cần.

### Cấu hình môi trường
Xem `app/src/modules/env/config.ts` để biết đầy đủ key. Các trường chính:
- RPC endpoints: Solana, Sui
- Databases: MongoDB/SQLite
- Cache/Queue: Redis
- API keys: CEX, Oracles (Pyth, v.v.)

Gợi ý biến môi trường (ví dụ):
```
SOLANA_RPC_URL=
SUI_RPC_URL=
MONGODB_URI=
REDIS_URL=
PYTH_ENDPOINT=
# API keys CEX nếu dùng
BINANCE_API_KEY=
BINANCE_API_SECRET=
```

### Roadmap (Solana)
- Hoàn thiện adapters: Raydium, Orca, Meteora (fetchers, actions, test cases).
- Ingestion: realtime index (ticks/swaps/pools) qua RPC + backfill.
- Scoring + Allocation: tối ưu trọng số theo biến động/phí/độ sâu.
- Risk engine: thêm tín hiệu (funding, order‑book walls, oracle drift) và chiến lược hedge.

### Tài liệu liên quan
- Kiến trúc: `app/ARCHITECTURE.md`
- UI (demo): `app/ui/lp-bot-ui`
- DEX adapters: `app/src/modules/blockchains/dexes/*`

—

Kani sounds like a dream — but it’s real. Now in private testing, and soon launching publicly.
<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
"# cicore" 
