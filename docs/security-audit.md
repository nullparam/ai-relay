# AI Relay 安全审计报告

**审计日期**: 2026-05-23  
**审计人**: 码飞 (技术总监)  
**项目版本**: v2.0.0  

---

## 1. 扫描工具

| 工具 | 版本 | 用途 |
|------|------|------|
| trufflehog3 | 3.0.10 | Git 仓库敏感信息扫描 |
| license-checker | (npx) | 依赖许可证检查 |
| 手动检查 | - | 源码硬编码密钥排查 |

---

## 2. 安全扫描结果

### 2.1 源码扫描 ✅ 通过

- `src/` 目录下无硬编码 API Key、Secret、Token
- 所有敏感配置均通过 `process.env` 读取
- `sk-` 开头的引用仅为注释/翻译中的示例文本

### 2.2 Git 历史扫描 ⚠️ 发现问题

#### 问题 1: `.env.production` 仍在 Git 跟踪中

- **严重级别**: HIGH
- **文件**: `.env.production`
- **内容**: `VERCEL_OIDC_TOKEN` (JWT Token)
- **提交记录**: 
  - `3a563e0` - 首次提交 (含更多敏感变量)
  - `e1313ca` - 更新 (当前版本，仅含 OIDC Token)
- **影响**: Vercel OIDC Token 泄露，可能被用于访问 Vercel 项目

#### 问题 2: `.env.local.bak` 残留在 Git 历史中

- **严重级别**: CRITICAL
- **文件**: `.env.local.bak` (已从跟踪中移除，但历史仍存在)
- **提交记录**: `21ada74`
- **泄露的密钥**:
  - `RELAY_API_KEY`: relay-...b24e
  - `XIAOMI_KEYS`: tp-cbh... (2个)
  - `XIAOMIMIMO_SGP_KEYS`: tp-shdg..., tp-sdf..., tp-sc9..., tp-cdj... (4个)
  - `LPGPT_KEYS`: sk-Ms2...phHp

### 2.3 本地 .env 文件检查

| 文件 | 是否在 .gitignore | 是否有敏感内容 |
|------|-------------------|----------------|
| `.env.local` | ✅ (.env*.local) | ✅ 有 (API Keys) |
| `.env.local.production` | ✅ (.env*.local) | ✅ 有 (OIDC Token) |
| `.env.local.preview` | ✅ (.env*.local) | ✅ 有 (OIDC Token) |
| `.env.production.local` | ✅ (.env*.local) | ✅ 有 (OIDC Token) |
| `.env.production` | ❌ **未被忽略** | ✅ 有 (OIDC Token) |
| `.env.local.example` | N/A (模板) | ✅ 无真实密钥 |

---

## 3. License 合规检查

### 3.1 依赖许可证统计

| License | 数量 | GPL 感染风险 |
|---------|------|--------------|
| MIT | 345 | ✅ 安全 |
| ISC | 38 | ✅ 安全 |
| Apache-2.0 | 16 | ✅ 安全 |
| BSD-2-Clause | 7 | ✅ 安全 |
| BSD-3-Clause | 5 | ✅ 安全 |
| BlueOak-1.0.0 | 5 | ✅ 安全 |
| Python-2.0 | 1 | ✅ 安全 |
| MPL-2.0 | 1 | ⚠️ 注意 (弱 copyleft) |
| CC-BY-4.0 | 1 | ✅ 安全 |
| CC0-1.0 | 1 | ✅ 安全 |
| Unlicense | 1 | ✅ 安全 |
| 0BSD | 1 | ✅ 安全 |

### 3.2 GPL 感染检查 ✅ 通过

- **AGPL**: 0 个
- **GPL-3.0**: 0 个
- **GPL-2.0**: 0 个
- **LGPL**: 0 个

### 3.3 License 文件状态 ⚠️ 缺失

- **MIT LICENSE 文件**: ❌ 不存在
- **package.json license 字段**: ❌ 未定义
- **项目 private 标记**: `true` (UNLICENSED)

---

## 4. 修复建议

### 4.1 紧急修复 (立即执行)

#### 1. 从 Git 跟踪中移除 `.env.production`

```bash
cd /Users/parsifal/Repo/Service/ai-relay
git rm --cached .env.production
echo ".env.production" >> .gitignore
git add .gitignore
git commit -fix(security): remove .env.production from git tracking"
```

#### 2. 轮换已泄露的密钥

| 密钥 | 操作 |
|------|------|
| VERCEL_OIDC_TOKEN | 在 Vercel Dashboard 重新生成 |
| RELAY_API_KEY | 重新生成并更新到 Vercel 环境变量 |
| XIAOMI_KEYS | 联系小米重新申请 |
| XIAOMIMIMO_SGP_KEYS | 联系小米重新申请 |
| LPGPT_KEYS | 重新生成 API Key |

#### 3. 创建 MIT LICENSE 文件

```bash
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2026 AI Relay Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
```

### 4.2 建议修复 (可选)

#### 清理 Git 历史 (破坏性操作)

⚠️ **警告**: 此操作会重写 Git 历史，需要所有协作者重新 clone。

```bash
# 安装 git-filter-repo
brew install git-filter-repo

# 从历史中移除敏感文件
git filter-repo --path .env.production --path .env.local.bak --invert-paths

# 强制推送 (需要团队协调)
git push origin main --force
```

---

## 5. 完成标准检查

| 检查项 | 状态 | 说明 |
|--------|------|------|
| trufflehog 扫描零告警 | ⚠️ | 源码零告警，Git 历史有泄露 |
| 所有依赖 License 兼容 | ✅ | 无 GPL 感染 |
| MIT License 文件已就位 | ❌ | 需要创建 |
| 无 Secret 泄露路径 | ⚠️ | `.env.production` 需要从 Git 移除 |

---

## 6. 总结

**整体安全评级**: ⚠️ 需要修复

- ✅ 源码安全，无硬编码密钥
- ✅ 依赖许可证合规，无 GPL 感染
- ⚠️ Git 历史中有密钥泄露，需要轮换
- ⚠️ `.env.production` 需要从 Git 跟踪中移除
- ❌ MIT LICENSE 文件缺失

**建议优先级**:
1. 🔴 立即轮换所有泄露的密钥
2. 🟠 移除 `.env.production` 的 Git 跟踪
3. 🟡 创建 MIT LICENSE 文件
4. 🟢 考虑清理 Git 历史 (需团队协调)
