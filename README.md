# AI Relay ⚡

轻量级 AI API 中转服务，部署在 Vercel (Edge Runtime + KV)。
A lightweight AI API relay service, deployed on Vercel (Edge Runtime + KV).

[English](#english) | [中文](#中文)

---

<a name="english"></a>
## English

### Features

- 🔄 **Multi-Key Rotation** — Round-Robin + 429 auto-backoff.
- 🔀 **Multi-Provider Routing** — OpenAI / Claude / DeepSeek / MiMo.
- 📊 **Usage Tracking** — Request count + token usage (Vercel KV).
- 📡 **Streaming Responses** — SSE pass-through.
- 🛡️ **OpenAI Compatible** — Connects directly via OpenAI SDK.
- 🔑 **Key Segregation & Temporary Keys** — Separate admin panel keys, api request keys, and support for generating stateless temporary keys.

### Quick Start

#### 1. Clone & Install
```bash
git clone https://github.com/ParsifalC/ai-relay.git
cd ai-relay
npm install
```

#### 2. Configure Environment Variables
```bash
cp .env.local.example .env.local
# Edit .env.local and fill in your API Keys
```

#### 3. Local Development
```bash
npm run dev
# Visit http://localhost:3000
```

#### 4. Deploy to Vercel
```bash
npx vercel
```

### Usage

```bash
curl -X POST https://your-domain.vercel.app/v1/chat/completions \
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
    api_key="YOUR_RELAY_API_KEY", # Or a temporary key starting with sk-relay-temp-
    base_url="https://your-domain.vercel.app/v1"
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

### Environment Variables

| Variable | Description | Required |
|------|------|------|
| `RELAY_ADMIN_KEY` | Admin dashboard login key (comma-separated, falls back to `RELAY_API_KEY` if not set) | ⬜ |
| `RELAY_API_KEY` | Client request auth key (comma-separated) | ✅ |
| `RELAY_SIGNING_SECRET` | Secret for signing temporary keys (falls back to admin/api key if not set) | ⬜ |
| `OPENAI_KEYS` | OpenAI API Keys (comma-separated) | ⬜ |
| `CLAUDE_KEYS` | Anthropic API Keys | ⬜ |
| `DEEPSEEK_KEYS` | DeepSeek API Keys | ⬜ |
| `XIAOMI_KEYS` | Xiaomi API Keys | ⬜ |

### Temporary Request Keys
You can generate temporary client request keys in the Admin Panel with specified durations (e.g. 1 hour, 1 day). 
- **Format**: `sk-relay-temp-${base64Payload}.${signature}`
- **Validation**: Statelessly validated using HMAC-SHA256 on the Vercel Edge.

---

<a name="中文"></a>
## 中文

### 特性

- 🔄 **多 Key 轮换** — Round-Robin + 429 自动退避
- 🔀 **多 Provider 路由** — OpenAI / Claude / DeepSeek / MiMo
- 📊 **用量追踪** — 调用次数 + Token 用量 (Vercel KV)
- 📡 **流式响应** — SSE 透传
- 🛡️ **OpenAI 兼容** — 直接用 OpenAI SDK 对接
- 🔑 **密钥分离与临时 Key** — 区分后台管理密钥和 API 请求密钥，并支持在后台生成无状态的临时密钥。

### 快速开始

#### 1. 克隆 & 安装
```bash
git clone https://github.com/ParsifalC/ai-relay.git
cd ai-relay
npm install
```

#### 2. 配置环境变量
```bash
cp .env.local.example .env.local
# 编辑 .env.local 填入你的 API Keys
```

#### 3. 本地开发
```bash
npm run dev
# 访问 http://localhost:3000
```

#### 4. 部署到 Vercel
```bash
npx vercel
```

### 使用方法

```bash
curl -X POST https://your-domain.vercel.app/v1/chat/completions \
  -H "Authorization: Bearer YOUR_RELAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

#### 使用 OpenAI SDK

```python
from openai import OpenAI

client = OpenAI(
    api_key="YOUR_RELAY_API_KEY", # 或者是 sk-relay-temp- 开头的临时 Key
    base_url="https://your-domain.vercel.app/v1"
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

### 环境变量

| 变量 | 说明 | 必填 |
|------|------|------|
| `RELAY_ADMIN_KEY` | 后台管理登录密钥 (支持逗号分隔多个，未设置则回退到 `RELAY_API_KEY`) | ⬜ |
| `RELAY_API_KEY` | 客户端请求鉴权密钥 (支持逗号分隔多个) | ✅ |
| `RELAY_SIGNING_SECRET` | 临时 Key 签名密钥 (未设置则回退到第一个管理/请求密钥) | ⬜ |
| `OPENAI_KEYS` | OpenAI API Keys (逗号分隔) | ⬜ |
| `CLAUDE_KEYS` | Anthropic API Keys | ⬜ |
| `DEEPSEEK_KEYS` | DeepSeek API Keys | ⬜ |
| `XIAOMI_KEYS` | Xiaomi API Keys | ⬜ |

### 临时请求密钥
在后台面板中可以生成指定有效期的临时请求密钥（例如 1小时、1天）。
- **格式**：`sk-relay-temp-${base64Payload}.${signature}`
- **校验**：在 Vercel Edge 服务端采用 HMAC-SHA256 算法进行无状态签名校验。
