# AI Relay ⚡

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ParsifalC/ai-relay&env=RELAY_API_KEY,RELAY_ADMIN_KEY,RELAY_SIGNING_SECRET&envDescription=API%20authentication%20keys%20(required%20for%20security)&envLink=https://github.com/ParsifalC/ai-relay#environment-variables)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

轻量级 AI API 中转服务，部署在 Vercel (Edge Runtime + KV)。
A lightweight AI API relay service, deployed on Vercel (Edge Runtime + KV).

[English](#english) | [中文](#中文)

---

<a name="english"></a>
## English

### ✨ Features

- 🔄 **Multi-Key Rotation** — Round-Robin + 429 auto-backoff
- 🔀 **Multi-Provider Routing** — OpenAI / Claude / DeepSeek / MiMo / Custom Providers
- 🛡️ **Multi-Level Fallback** — Provider-level + Key-level fallback with chain failover
- ⚡ **Circuit Breaker** — Automatic failover when provider is down
- 📊 **Admin Dashboard** — Full-featured management panel at `/admin`
  - Key management (add/delete/test connectivity)
  - Quota configuration (dynamic quota override, KV persistence)
  - Model connectivity testing
  - Temporary API key generation
  - Custom provider management (CRUD)
  - Real-time Key Pool sync
  - Deployment time and model availability status
- 📈 **Usage Tracking** — Request count + token usage (Vercel KV)
- 📡 **Streaming Responses** — SSE pass-through
- 🔗 **OpenAI Compatible** — Works directly with OpenAI SDK
- 🔑 **Key Segregation** — Separate admin/API/temporary keys
- 🏥 **Health Check** — `/health` endpoint for monitoring
- 🌐 **Custom Base URL** — Support custom API base URLs
- 🎭 **Virtual Model Mapping** — Map virtual model names to real models
- 🚀 **One-Click Deploy** — Deploy to Vercel in under 2 minutes

### 🚀 Quick Start

#### One-Click Deploy (Recommended)

**Prerequisites:**
- A [Vercel account](https://vercel.com/signup) (free tier works)
- At least one AI provider API key (OpenAI, Claude, DeepSeek, or Xiaomi)

**Steps:**
1. Click the **Deploy with Vercel** button at the top of this README
2. Vercel will prompt you to fill in 3 required environment variables:
   - `RELAY_API_KEY` — Your client request auth key (choose any strong secret)
   - `RELAY_ADMIN_KEY` — Your admin dashboard login key (can be the same as above)
   - `RELAY_SIGNING_SECRET` — Secret for signing temporary keys (can be the same as above)
3. Click **Deploy** — done! Your relay service is live.

**After Deployment:**
1. Visit `https://your-project.vercel.app/health` to verify it's running
2. Visit `https://your-project.vercel.app/admin` and log in with your `RELAY_ADMIN_KEY`
3. In the Admin panel, go to **Provider Keys** and add your API keys (OpenAI, Claude, etc.)
4. Start making requests!

#### Manual Setup

```bash
# Clone & Install
git clone https://github.com/ParsifalC/ai-relay.git
cd ai-relay
npm install

# Configure Environment Variables
cp .env.local.example .env.local
# Edit .env.local and fill in your API Keys

# Local Development
npm run dev
# Visit http://localhost:3000

# Deploy to Vercel
npx vercel
```

### 📖 Usage

#### API Endpoint
```
POST https://your-project.vercel.app/v1/chat/completions
```

#### Using curl
```bash
curl -X POST https://your-project.vercel.app/v1/chat/completions \
  -H "Authorization: Bearer YOUR_RELAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

#### Using OpenAI SDK
```python
from openai import OpenAI

client = OpenAI(
    api_key="YOUR_RELAY_API_KEY",
    base_url="https://your-project.vercel.app/v1"
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

#### Temporary Keys
Generate temporary keys in the Admin panel with specified durations:
- **Format**: `***${base64Payload}.${signature}`
- **Validation**: Stateless HMAC-SHA256 verification on Vercel Edge

### 🔧 Configuration

#### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `RELAY_API_KEY` | Client request auth key (comma-separated) | ✅ |
| `RELAY_ADMIN_KEY` | Admin dashboard login key (comma-separated, falls back to `RELAY_API_KEY` if not set) | ⬜ |
| `RELAY_SIGNING_SECRET` | Secret for signing temporary keys (falls back to admin/api key if not set) | ⬜ |
| `OPENAI_KEYS` | OpenAI API Keys (comma-separated) | ⬜ |
| `CLAUDE_KEYS` | Anthropic API Keys | ⬜ |
| `DEEPSEEK_KEYS` | DeepSeek API Keys | ⬜ |
| `XIAOMI_KEYS` | Xiaomi API Keys | ⬜ |

> **Note:** Provider keys (OPENAI_KEYS, etc.) are configured via the Admin panel after deployment, not as Vercel environment variables. This is more secure — keys are stored in Vercel KV, not in your repo.

#### Custom Providers
Add custom providers in the Admin panel with:
- Provider name
- API base URL
- API key
- Supported models

### 🏗️ Architecture

AI Relay runs on Vercel Edge Runtime for low latency, with Vercel KV for persistent storage:
- **Edge Runtime**: Global distribution, <50ms latency
- **Vercel KV**: Redis-compatible storage for keys, quotas, and usage data
- **Circuit Breaker**: Automatic failover when provider is down
- **Multi-Level Fallback**: Provider → Key chain failover

### 📊 Admin Dashboard

Access the admin panel at `/admin` with your `RELAY_ADMIN_KEY`:

- **Provider Keys**: Manage API keys for all providers
- **Quota Configuration**: Set dynamic quotas per provider
- **Model Testing**: Test connectivity to specific models
- **Temporary Keys**: Generate time-limited API keys
- **Custom Providers**: Add/edit/delete custom providers
- **Usage Statistics**: View request counts and token usage
- **Key Pool Status**: Real-time sync status of all keys

### 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<a name="中文"></a>
## 中文

### ✨ 特性

- 🔄 **多 Key 轮换** — Round-Robin + 429 自动退避
- 🔀 **多 Provider 路由** — OpenAI / Claude / DeepSeek / MiMo / 自定义 Provider
- 🛡️ **多级 Fallback** — Provider 级 + Key 级链式故障转移
- ⚡ **熔断器** — Provider 故障时自动切换
- 📊 **Admin 后台** — 全功能管理面板 `/admin`
  - 密钥管理（添加/删除/测试连通性）
  - 配额配置（动态配额覆盖，KV 持久化）
  - 模型连通性测试
  - 临时 API Key 生成
  - 自定义 Provider 管理（CRUD）
  - 实时 Key Pool 同步
  - 部署时间和模型可用性状态
- 📈 **用量追踪** — 调用次数 + Token 用量 (Vercel KV)
- 📡 **流式响应** — SSE 透传
- 🔗 **OpenAI 兼容** — 直接用 OpenAI SDK 对接
- 🔑 **密钥分离** — 区分 Admin Key / API Key / 临时 Key
- 🏥 **健康检查** — `/health` 端点用于监控
- 🌐 **自定义 Base URL** — 支持自定义 API 基础地址
- 🎭 **虚拟模型映射** — 将虚拟模型名映射到真实模型
- 🚀 **一键部署** — 2 分钟内部署到 Vercel

### 🚀 快速开始

#### 一键部署（推荐）

**前置条件：**
- 一个 [Vercel 账号](https://vercel.com/signup)（免费版即可）
- 至少一个 AI Provider 的 API Key（OpenAI、Claude、DeepSeek 或小米）

**步骤：**
1. 点击 README 顶部的 **Deploy with Vercel** 按钮
2. Vercel 会提示你填写 3 个必需的环境变量：
   - `RELAY_API_KEY` — 客户端请求鉴权密钥（自定义一个强密码即可）
   - `RELAY_ADMIN_KEY` — 后台管理登录密钥（可以和上面相同）
   - `RELAY_SIGNING_SECRET` — 临时 Key 签名密钥（可以和上面相同）
3. 点击 **Deploy** — 搞定！你的中转服务已上线。

**部署后：**
1. 访问 `https://你的项目.vercel.app/health` 确认服务正常
2. 访问 `https://你的项目.vercel.app/admin`，用 `RELAY_ADMIN_KEY` 登录
3. 在后台面板的 **Provider Keys** 中添加你的 API Key（OpenAI、Claude 等）
4. 开始调用！

#### 手动部署

```bash
# 克隆 & 安装
git clone https://github.com/ParsifalC/ai-relay.git
cd ai-relay
npm install

# 配置环境变量
cp .env.local.example .env.local
# 编辑 .env.local 填入你的 API Keys

# 本地开发
npm run dev
# 访问 http://localhost:3000

# 部署到 Vercel
npx vercel
```

### 📖 使用方法

#### API 端点
```
POST https://你的项目.vercel.app/v1/chat/completions
```

#### 使用 curl
```bash
curl -X POST https://你的项目.vercel.app/v1/chat/completions \
  -H "Authorization: Bearer YOUR_RELAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "你好！"}]
  }'
```

#### 使用 OpenAI SDK
```python
from openai import OpenAI

client = OpenAI(
    api_key="YOUR_RELAY_API_KEY",
    base_url="https://你的项目.vercel.app/v1"
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "你好！"}]
)
```

#### 临时密钥
在后台面板中生成指定有效期的临时密钥：
- **格式**：`***${base64Payload}.${signature}`
- **校验**：在 Vercel Edge 服务端采用 HMAC-SHA256 算法进行无状态签名校验

### 🔧 配置

#### 环境变量

| 变量 | 说明 | 必填 |
|------|------|------|
| `RELAY_API_KEY` | 客户端请求鉴权密钥 (支持逗号分隔多个) | ✅ |
| `RELAY_ADMIN_KEY` | 后台管理登录密钥 (支持逗号分隔多个，未设置则回退到 `RELAY_API_KEY`) | ⬜ |
| `RELAY_SIGNING_SECRET` | 临时 Key 签名密钥 (未设置则回退到第一个管理/请求密钥) | ⬜ |
| `OPENAI_KEYS` | OpenAI API Keys (逗号分隔) | ⬜ |
| `CLAUDE_KEYS` | Anthropic API Keys | ⬜ |
| `DEEPSEEK_KEYS` | DeepSeek API Keys | ⬜ |
| `XIAOMI_KEYS` | Xiaomi API Keys | ⬜ |

> **注意：** Provider 密钥（OPENAI_KEYS 等）建议通过 Admin 后台面板配置，而非 Vercel 环境变量。这样更安全 — 密钥存储在 Vercel KV 中，不暴露在代码仓库里。

#### 自定义 Provider
在后台面板中添加自定义 Provider：
- Provider 名称
- API 基础地址
- API 密钥
- 支持的模型列表

### 🏗️ 架构

AI Relay 运行在 Vercel Edge Runtime 上，实现低延迟全球分发，使用 Vercel KV 进行持久化存储：
- **Edge Runtime**：全球分发，延迟 <50ms
- **Vercel KV**：兼容 Redis 的存储，用于密钥、配额和用量数据
- **熔断器**：Provider 故障时自动切换
- **多级 Fallback**：Provider → Key 链式故障转移

### 📊 Admin 后台

访问 `/admin` 使用 `RELAY_ADMIN_KEY` 登录管理面板：

- **Provider Keys**：管理所有 Provider 的 API 密钥
- **配额配置**：为每个 Provider 设置动态配额
- **模型测试**：测试特定模型的连通性
- **临时密钥**：生成有时效的 API 密钥
- **自定义 Provider**：添加/编辑/删除自定义 Provider
- **用量统计**：查看请求次数和 Token 用量
- **Key Pool 状态**：实时同步所有密钥状态

### 🤝 贡献

欢迎贡献！请随时提交 Pull Request。

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 提交 Pull Request

### 📄 许可证

本项目基于 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。
