'use client';

import { useState, useEffect } from 'react';
import TokenTrendChart from './components/TokenTrendChart';

interface ProviderInfo {
  name: string;
  id: string;
  keyCount: number;
  availableKeys: number;
  configured: boolean;
  modelPrefixes: string[];
  errors?: Record<string, number>;
  keyErrors?: Array<{
    keyHash: string;
    errors: Record<string, { count: number; reason: string }>;
  }>;
}

interface AdminData {
  status: string;
  timestamp: string;
  providers: ProviderInfo[];
  usage: {
    requests: number;
    tokens: number;
    promptTokens: number;
    completionTokens: number;
    providers: Record<string, { requests: number; tokens: number; promptTokens: number; completionTokens: number }>;
  };
  quota: {
    daily: { used: number; limit: number | string };
    monthly: { used: number; limit: number | string };
    allowed: boolean;
  };
  config: {
    dailyLimit: number | null;
    monthlyLimit: number | null;
  };
}

const TRANSLATIONS = {
  zh: {
    // Login
    adminLogin: '🔐 后台登录',
    enterAdminKey: '请输入管理员密钥 (RELAY_ADMIN_KEY)',
    login: '登录',
    invalidKey: '无效的 API 密钥',
    failedFetch: '获取后台数据失败',

    // Header & Global
    title: '⚡ AI Relay 后台管理',
    refresh: '🔄 刷新',
    autoRefreshInfo: '每15秒自动刷新 · 数据截至',

    // Quota Status
    quotaStatus: '📊 限额状态',
    dailyRequests: '今日已用请求次数',
    monthlyRequests: '当月已用请求次数',
    withinLimits: '✅ 正常运行中',
    rateLimited: '🚫 已触发限额限流',

    // Today's Usage
    todaysUsage: '📈 今日消耗概览',
    requests: '请求次数',
    totalTokens: '总 Token',
    promptTokens: '输入 Token',
    completionTokens: '输出 Token',
    byProvider: '按服务商细分',
    providerCol: '服务商',
    requestsCol: '请求数',
    promptCol: '输入 Token',
    completionCol: '输出 Token',
    totalCol: '总计 Token',

    // API Errors
    apiErrorsTitle: '🚨 接口异常详情 (今日)',
    times: '次',

    // Temporary Request Key Generator
    tempKeyTitle: '🔑 生成临时 API 请求密钥',
    tempKeyDesc: '允许生成带有过期时间的、临时的 API 请求 Key。此 Key 可用于直接调用 chat/completions 等中转接口，但不支持登录此后台管理系统。',
    tempDurationLabel: '有效期：',
    duration1h: '1 小时',
    duration1d: '1 天',
    duration7d: '7 天',
    duration30d: '30 天',
    generateBtn: '生成临时密钥',
    copy: '复制',
    copied: '已复制！',
    generatedKeyLabel: '生成的临时密钥（点击可选择）：',
    expiresAtLabel: '过期时间：',
    tempKeyNotice: '⚠️ 注意：该临时 Key 使用 HMAC 签名进行无状态校验，一旦生成便无法在后台撤销或编辑，过期后会自动失效。请妥善保管。',

    // Provider Key Pools
    providerKeyPools: '🔑 服务商密钥池',
    providerKeyPoolsDesc: '在下方列表中选择一个服务商以管理其 API 密钥和故障转移（回退）链配置。',
    tblProvider: '服务商',
    tblStatus: '配置状态',
    tblKeys: '密钥数',
    tblAvailable: '可用密钥',
    tblModelPrefixes: '支持模型前缀',
    statusOk: '配置正常',
    statusNoKeys: '无可用密钥',

    // Provider Config Editor
    configureTitle: '⚙️ 配置 {name}',
    providerIdLabel: '服务商 ID:',
    btnClose: '关闭',
    loadingConfig: '正在加载配置...',
    apiKeyPoolTitle: '🔑 API 密钥池',
    kvWarningManaged: '⚠️ KV 密钥池已激活：此处的密钥将覆盖本地环境变量 (.env.local) 中该服务商的密钥。',
    kvWarningEnv: '💡 当前正在使用本地环境变量 (.env.local) 中定义的密钥。在下方添加密钥将存入 KV 并覆盖环境变量密钥池。',
    addKeyPlaceholder: '请输入原始 API 密钥',
    btnAddKey: '添加',
    keyHashLabel: '哈希:',
    keySourceEnv: '环境变量',
    keySourceKv: 'KV 存储',
    btnDeleteKey: '删除',
    deleteEnvKeyTitle: '环境变量中的密钥必须在 .env.local 中修改/删除',
    deleteKvKeyTitle: '删除此密钥',
    noKeysConfigured: '未配置任何 API 密钥，对此服务商的请求将失败。',
    confirmDeleteKey: '您确定要删除此 API 密钥吗？',

    // Fallback Chain
    fallbackChainTitle: '🔗 故障转移（回退）链',
    kvFallbackActive: '🟢 KV 回退链已激活：自定义优先级链已存储在 KV 中。',
    kvFallbackStatic: '⚪ 正在使用静态默认值：在系统配置文件中定义。',
    modelSelectorAuto: '自动 (Auto)',
    noFallbacksConfigured: '未配置回退链，发生错误时将直接报错。',
    btnAddFallback: '+ 添加',
    noOtherProviders: '没有其他可添加的服务商。',
    btnResetFallbacks: '重置为默认',
    confirmResetFallbacks: '您确定要将回退链重置为系统静态默认值吗？',
    btnSaveFallbacks: '保存回退链',
    msgKeyAdded: 'API 密钥添加成功',
    msgKeyDeleted: 'API 密钥删除成功',
    msgFallbackSaved: '回退链保存成功',
    msgFallbackReset: '回退链已成功重置为默认值',
    msgLoadConfigFailed: '加载配置失败',
  },
  en: {
    // Login
    adminLogin: '🔐 Admin Login',
    enterAdminKey: 'Enter Admin Key (RELAY_ADMIN_KEY)',
    login: 'Login',
    invalidKey: 'Invalid API key',
    failedFetch: 'Failed to fetch admin data',

    // Header & Global
    title: '⚡ AI Relay Admin',
    refresh: '🔄 Refresh',
    autoRefreshInfo: 'Auto-refreshes every 15s · Data as of',

    // Quota Status
    quotaStatus: '📊 Quota Status',
    dailyRequests: 'Daily Requests',
    monthlyRequests: 'Monthly Requests',
    withinLimits: '✅ Within limits',
    rateLimited: '🚫 Rate limited',

    // Today's Usage
    todaysUsage: "📈 Today's Usage",
    requests: 'Requests',
    totalTokens: 'Total Tokens',
    promptTokens: 'Prompt Tokens',
    completionTokens: 'Completion Tokens',
    byProvider: 'By Provider',
    providerCol: 'Provider',
    requestsCol: 'Requests',
    promptCol: 'Prompt',
    completionCol: 'Completion',
    totalCol: 'Total',

    // API Errors
    apiErrorsTitle: '🚨 API Errors (Today)',
    times: 'times',

    // Temporary Request Key Generator
    tempKeyTitle: '🔑 Generate Temporary API Key',
    tempKeyDesc: 'Generate a temporary API key with an expiration date. This key can be used to request relay APIs (e.g. chat/completions) but cannot be used to log in to the admin panel.',
    tempDurationLabel: 'Duration:',
    duration1h: '1 Hour',
    duration1d: '1 Day',
    duration7d: '7 Days',
    duration30d: '30 Days',
    generateBtn: 'Generate Key',
    copy: 'Copy',
    copied: 'Copied!',
    generatedKeyLabel: 'Generated Key (Click to Copy):',
    expiresAtLabel: 'Expires At:',
    tempKeyNotice: '⚠️ Note: This temporary key is validated statelessly using HMAC. Once generated, it cannot be revoked or modified in this panel and will expire automatically.',

    // Provider Key Pools
    providerKeyPools: '🔑 Provider Key Pools',
    providerKeyPoolsDesc: 'Select a provider from the list below to manage its API keys and fallback configuration.',
    tblProvider: 'Provider',
    tblStatus: 'Status',
    tblKeys: 'Keys',
    tblAvailable: 'Available',
    tblModelPrefixes: 'Model Prefixes',
    statusOk: 'OK',
    statusNoKeys: 'NO KEYS',

    // Provider Config Editor
    configureTitle: '⚙️ Configure {name}',
    providerIdLabel: 'Provider ID:',
    btnClose: 'Close',
    loadingConfig: 'Loading configuration...',
    apiKeyPoolTitle: '🔑 API Key Pool',
    kvWarningManaged: '⚠️ KV key pool active: These keys override local environment variables (.env.local) for this provider.',
    kvWarningEnv: '💡 Currently using keys defined in local environment variables (.env.local). Adding a key below will store it in KV and override the environment variable pool.',
    addKeyPlaceholder: 'Enter raw API key',
    btnAddKey: 'Add',
    keyHashLabel: 'Hash:',
    keySourceEnv: 'env',
    keySourceKv: 'kv',
    btnDeleteKey: 'Delete',
    deleteEnvKeyTitle: 'Environment keys must be deleted from .env.local file',
    deleteKvKeyTitle: 'Remove key',
    noKeysConfigured: 'No API keys configured. Requests will fail.',
    confirmDeleteKey: 'Are you sure you want to delete this API Key?',

    // Fallback Chain
    fallbackChainTitle: '🔗 Fallback Chain',
    kvFallbackActive: '🟢 KV fallback chain active: Custom priority chain is stored in KV.',
    kvFallbackStatic: '⚪ Using static defaults: Defined in system config files.',
    modelSelectorAuto: 'Auto',
    noFallbacksConfigured: 'No fallbacks. Fails immediately on error.',
    btnAddFallback: '+ Add',
    noOtherProviders: 'No other providers available to add.',
    btnResetFallbacks: 'Reset to Default',
    confirmResetFallbacks: 'Are you sure you want to reset fallbacks to static defaults?',
    btnSaveFallbacks: 'Save Chain',
    msgKeyAdded: 'API Key added successfully',
    msgKeyDeleted: 'API Key removed successfully',
    msgFallbackSaved: 'Fallback chain saved successfully',
    msgFallbackReset: 'Fallback chain reset to default successfully',
    msgLoadConfigFailed: 'Failed to load configuration',
  }
};

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<'zh' | 'en'>('zh');

  // Configuration management states
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [providerKeys, setProviderKeys] = useState<Array<{ hash: string; masked: string; source: string }> | null>(null);
  const [providerFallbacks, setProviderFallbacks] = useState<{ current: string[]; staticDefault: string | null; staticDefaults: string[]; isOverride: boolean; availableModels: Record<string, { id: string; displayName: string }[]> } | null>(null);
  const [newKeyInput, setNewKeyInput] = useState('');
  const [operationLoading, setOperationLoading] = useState(false);
  const [configMessage, setConfigMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [activeFallbacks, setActiveFallbacks] = useState<string[]>([]);
  const [selectedFallbackToAdd, setSelectedFallbackToAdd] = useState('');

  // Temporary Key Generator States
  const [tempDuration, setTempDuration] = useState<number>(86400); // Default 1 day (86400 seconds)
  const [generatedKey, setGeneratedKey] = useState<string>('');
  const [generatedKeyExpires, setGeneratedKeyExpires] = useState<string>('');
  const [tempKeyLoading, setTempKeyLoading] = useState<boolean>(false);
  const [tempKeyMessage, setTempKeyMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const t = TRANSLATIONS[lang];

  // Load language settings on mount
  useEffect(() => {
    const cachedLang = localStorage.getItem('airelay_lang');
    if (cachedLang === 'zh' || cachedLang === 'en') {
      setLang(cachedLang);
    } else {
      const userLang = navigator.language.toLowerCase();
      const preferred = userLang.startsWith('zh') ? 'zh' : 'en';
      setLang(preferred);
    }
  }, []);

  const handleSetLang = (newLang: 'zh' | 'en') => {
    setLang(newLang);
    localStorage.setItem('airelay_lang', newLang);
  };

  // Automatically select a default value for the fallback-to-add dropdown when options change
  useEffect(() => {
    const usedProviders = activeFallbacks.map(fb => {
      const colonIdx = fb.indexOf(':');
      return colonIdx >= 0 ? fb.slice(0, colonIdx) : fb;
    });
    if (selectedProvider && data) {
      const available = data.providers.filter(p => p.id !== selectedProvider && !usedProviders.includes(p.id));
      if (available.length > 0 && !available.some(p => p.id === selectedFallbackToAdd)) {
        setSelectedFallbackToAdd(available[0].id);
      }
    } else {
      setSelectedFallbackToAdd('');
    }
  }, [selectedProvider, activeFallbacks, data, selectedFallbackToAdd]);

  // Restore cached API key from localStorage on mount
  useEffect(() => {
    const cached = localStorage.getItem('airelay_admin_key');
    if (cached) {
      setApiKey(cached);
      setLoading(true);
      fetch('/api/admin', {
        headers: { Authorization: `Bearer ${cached}` },
      })
        .then((res) => {
          if (res.status === 401) {
            localStorage.removeItem('airelay_admin_key');
            return;
          }
          return res.json();
        })
        .then((json) => {
          if (json) {
            setData(json);
            setAuthenticated(true);
          }
        })
        .catch(() => {
          localStorage.removeItem('airelay_admin_key');
        })
        .finally(() => setLoading(false));
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (res.status === 401) {
        setError('unauthorized');
        setAuthenticated(false);
        return;
      }
      const json = await res.json();
      setData(json);
      setAuthenticated(true);
      localStorage.setItem('airelay_admin_key', apiKey);
    } catch (e) {
      setError('failed_fetch');
    } finally {
      setLoading(false);
    }
  };

  const fetchProviderConfig = async (providerId: string) => {
    setOperationLoading(true);
    setConfigMessage(null);
    try {
      const [keysRes, fallbacksRes] = await Promise.all([
        fetch(`/api/admin/providers/${providerId}/keys`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        }),
        fetch(`/api/admin/providers/${providerId}/fallbacks`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        }),
      ]);

      if (!keysRes.ok || !fallbacksRes.ok) {
        throw new Error('Failed to fetch provider configuration');
      }

      const keysData = await keysRes.json();
      const fallbacksData = await fallbacksRes.json();

      setProviderKeys(keysData.keys);
      setProviderFallbacks({
        current: fallbacksData.fallbacks,
        staticDefault: fallbacksData.staticDefault,
        staticDefaults: fallbacksData.staticDefaults || [],
        isOverride: fallbacksData.isOverride,
        availableModels: fallbacksData.availableModels || {},
      });
      setActiveFallbacks(fallbacksData.fallbacks || []);
    } catch (e) {
      setConfigMessage({ text: e instanceof Error ? e.message : t.msgLoadConfigFailed, type: 'error' });
    } finally {
      setOperationLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProvider && authenticated) {
      fetchProviderConfig(selectedProvider);
    } else {
      setProviderKeys(null);
      setProviderFallbacks(null);
    }
  }, [selectedProvider, authenticated]);

  const handleAddKey = async () => {
    if (!selectedProvider || !newKeyInput.trim()) return;
    setOperationLoading(true);
    setConfigMessage(null);
    try {
      const res = await fetch(`/api/admin/providers/${selectedProvider}/keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ key: newKeyInput.trim() }),
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error?.message || 'Failed to add key');
      }
      setNewKeyInput('');
      setConfigMessage({ text: t.msgKeyAdded, type: 'success' });
      await fetchProviderConfig(selectedProvider);
      await fetchData(); // refresh global key counts
    } catch (e) {
      setConfigMessage({ text: e instanceof Error ? e.message : (lang === 'zh' ? '添加密钥失败' : 'Failed to add key'), type: 'error' });
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDeleteKey = async (hash: string) => {
    if (!selectedProvider) return;
    const confirmMsg = t.confirmDeleteKey;
    if (!confirm(confirmMsg)) return;
    setOperationLoading(true);
    setConfigMessage(null);
    try {
      const res = await fetch(`/api/admin/providers/${selectedProvider}/keys`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ hash }),
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error?.message || 'Failed to delete key');
      }
      setConfigMessage({ text: t.msgKeyDeleted, type: 'success' });
      await fetchProviderConfig(selectedProvider);
      await fetchData(); // refresh global key counts
    } catch (e) {
      setConfigMessage({ text: e instanceof Error ? e.message : (lang === 'zh' ? '删除密钥失败' : 'Failed to delete key'), type: 'error' });
    } finally {
      setOperationLoading(false);
    }
  };

  const handleSaveFallbacks = async (newChain: string[]) => {
    if (!selectedProvider) return;
    setOperationLoading(true);
    setConfigMessage(null);
    try {
      const res = await fetch(`/api/admin/providers/${selectedProvider}/fallbacks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ fallbacks: newChain }),
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error?.message || 'Failed to save fallback chain');
      }
      setConfigMessage({ text: t.msgFallbackSaved, type: 'success' });
      await fetchProviderConfig(selectedProvider);
    } catch (e) {
      setConfigMessage({ text: e instanceof Error ? e.message : (lang === 'zh' ? '保存回退链失败' : 'Failed to save fallback chain'), type: 'error' });
    } finally {
      setOperationLoading(false);
    }
  };

  const handleResetFallbacks = async () => {
    if (!selectedProvider) return;
    const confirmMsg = t.confirmResetFallbacks;
    if (!confirm(confirmMsg)) return;
    setOperationLoading(true);
    setConfigMessage(null);
    try {
      const res = await fetch(`/api/admin/providers/${selectedProvider}/fallbacks`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error?.message || 'Failed to reset fallbacks');
      }
      setConfigMessage({ text: t.msgFallbackReset, type: 'success' });
      await fetchProviderConfig(selectedProvider);
    } catch (e) {
      setConfigMessage({ text: e instanceof Error ? e.message : (lang === 'zh' ? '重置回退链失败' : 'Failed to reset fallbacks'), type: 'error' });
    } finally {
      setOperationLoading(false);
    }
  };

  const handleGenerateTempKey = async () => {
    setTempKeyLoading(true);
    setTempKeyMessage(null);
    setGeneratedKey('');
    setGeneratedKeyExpires('');
    setCopied(false);
    try {
      const res = await fetch('/api/admin/temp-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ durationSeconds: tempDuration }),
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error?.message || 'Failed to generate temporary key');
      }
      setGeneratedKey(resData.key);
      setGeneratedKeyExpires(resData.expiresAt);
      setTempKeyMessage({ text: lang === 'zh' ? '生成成功！' : 'Key generated successfully!', type: 'success' });
    } catch (e) {
      setTempKeyMessage({
        text: e instanceof Error ? e.message : (lang === 'zh' ? '生成失败' : 'Failed to generate temporary key'),
        type: 'error',
      });
    } finally {
      setTempKeyLoading(false);
    }
  };

  const handleCopy = () => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (authenticated) {
      const interval = setInterval(fetchData, 15000);
      return () => clearInterval(interval);
    }
  }, [authenticated, apiKey]);

  const fmtNum = (n: number) => n.toLocaleString();
  const fmtTokens = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
  };

  if (!authenticated) {
    return (
      <main style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '100vh', padding: '2rem',
        position: 'relative'
      }}>
        {/* Language switch on login screen */}
        <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
          <button
            onClick={() => handleSetLang(lang === 'zh' ? 'en' : 'zh')}
            style={{
              padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #333',
              backgroundColor: '#111', color: '#ccc', cursor: 'pointer', fontSize: '0.85rem'
            }}
          >
            {lang === 'zh' ? 'English' : '中文'}
          </button>
        </div>

        <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>{t.adminLogin}</h1>
        <div style={{
          display: 'flex', gap: '0.5rem', maxWidth: '400px', width: '100%',
        }}>
          <input
            type="password"
            placeholder={t.enterAdminKey}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchData()}
            style={{
              flex: 1, padding: '0.75rem 1rem', borderRadius: '8px',
              border: '1px solid #333', backgroundColor: '#111', color: '#e0e0e0',
              fontSize: '1rem', outline: 'none',
            }}
          />
          <button
            onClick={fetchData}
            disabled={loading || !apiKey}
            style={{
              padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none',
              backgroundColor: '#2563eb', color: 'white', fontSize: '1rem',
              cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? '...' : t.login}
          </button>
        </div>
        {error && (
          <p style={{ color: '#ef4444', marginTop: '1rem' }}>
            {error === 'unauthorized' ? t.invalidKey : (error === 'failed_fetch' ? t.failedFetch : error)}
          </p>
        )}
      </main>
    );
  }

  return (
    <main style={{
      maxWidth: '900px', margin: '0 auto', padding: '2rem',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '2rem',
      }}>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>{t.title}</h1>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={() => handleSetLang(lang === 'zh' ? 'en' : 'zh')}
            style={{
              padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #333',
              backgroundColor: '#111', color: '#ccc', cursor: 'pointer', fontSize: '0.85rem'
            }}
          >
            {lang === 'zh' ? 'English' : '中文'}
          </button>
          <button
            onClick={fetchData}
            style={{
              padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #333',
              backgroundColor: 'transparent', color: '#888', cursor: 'pointer',
            }}
          >
            {t.refresh}
          </button>
        </div>
      </div>

      {/* Quota Status */}
      <section style={{
        padding: '1.5rem', borderRadius: '12px', border: '1px solid #333',
        backgroundColor: '#111', marginBottom: '1.5rem',
      }}>
        <h2 style={{ fontSize: '1.2rem', marginTop: 0 }}>{t.quotaStatus}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <span style={{ color: '#888', fontSize: '0.85rem' }}>{t.dailyRequests}</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
              {fmtNum(data!.quota.daily.used)}
              <span style={{ color: '#666', fontSize: '1rem' }}>
                {' / '}{typeof data!.quota.daily.limit === 'number' ? fmtNum(data!.quota.daily.limit) : '∞'}
              </span>
            </div>
          </div>
          <div>
            <span style={{ color: '#888', fontSize: '0.85rem' }}>{t.monthlyRequests}</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
              {fmtNum(data!.quota.monthly.used)}
              <span style={{ color: '#666', fontSize: '1rem' }}>
                {' / '}{typeof data!.quota.monthly.limit === 'number' ? fmtNum(data!.quota.monthly.limit) : '∞'}
              </span>
            </div>
          </div>
        </div>
        <div style={{
          marginTop: '0.75rem', padding: '0.4rem 0.8rem', borderRadius: '6px',
          display: 'inline-block', fontSize: '0.85rem',
          backgroundColor: data!.quota.allowed ? '#064e3b' : '#7f1d1d',
          color: data!.quota.allowed ? '#34d399' : '#fca5a5',
        }}>
          {data!.quota.allowed ? t.withinLimits : t.rateLimited}
        </div>
      </section>

      {/* Today's Usage */}
      <section style={{
        padding: '1.5rem', borderRadius: '12px', border: '1px solid #333',
        backgroundColor: '#111', marginBottom: '1.5rem',
      }}>
        <h2 style={{ fontSize: '1.2rem', marginTop: 0 }}>{t.todaysUsage}</h2>
        <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
          <div>
            <span style={{ color: '#888', fontSize: '0.85rem' }}>{t.requests}</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
              {fmtNum(data!.usage.requests)}
            </div>
          </div>
          <div>
            <span style={{ color: '#888', fontSize: '0.85rem' }}>{t.totalTokens}</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
              {fmtTokens(data!.usage.tokens)}
            </div>
          </div>
          <div>
            <span style={{ color: '#888', fontSize: '0.85rem' }}>{t.promptTokens}</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#60a5fa' }}>
              {fmtTokens(data!.usage.promptTokens || 0)}
            </div>
          </div>
          <div>
            <span style={{ color: '#888', fontSize: '0.85rem' }}>{t.completionTokens}</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#34d399' }}>
              {fmtTokens(data!.usage.completionTokens || 0)}
            </div>
          </div>
        </div>

        {/* Per-provider usage breakdown */}
        {data!.usage.providers && Object.keys(data!.usage.providers).length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', color: '#888', marginBottom: '0.75rem' }}>{t.byProvider}</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #333' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem', color: '#888' }}>{t.providerCol}</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem', color: '#888' }}>{t.requestsCol}</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem', color: '#888' }}>{t.promptCol}</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem', color: '#888' }}>{t.completionCol}</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem', color: '#888' }}>{t.totalCol}</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data!.usage.providers).map(([name, stats]) => (
                  <tr key={name} style={{ borderBottom: '1px solid #222' }}>
                    <td style={{ padding: '0.5rem' }}>{name}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>{fmtNum(stats.requests)}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', color: '#60a5fa' }}>{fmtTokens(stats.promptTokens)}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', color: '#34d399' }}>{fmtTokens(stats.completionTokens)}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>{fmtTokens(stats.tokens)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Token Consumption Trend */}
      <TokenTrendChart apiKey={apiKey} lang={lang} />

      {/* Error Statistics */}
      {data!.providers.some((p) => p.errors && Object.keys(p.errors).length > 0) && (
        <section style={{
          padding: '1.5rem', borderRadius: '12px', border: '1px solid #333',
          backgroundColor: '#111', marginBottom: '1.5rem',
        }}>
          <h2 style={{ fontSize: '1.2rem', marginTop: 0 }}>{t.apiErrorsTitle}</h2>
          {data!.providers
            .filter((p) => p.errors && Object.keys(p.errors).length > 0)
            .map((p) => (
              <div key={p.id} style={{ marginBottom: '1.2rem' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#f87171' }}>
                  {p.name}
                </div>
                {/* Summary by status code */}
                <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  {Object.entries(p.errors!).map(([code, count]) => (
                    <span key={code} style={{
                      padding: '0.25rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem',
                      backgroundColor: code === '429' ? '#78350f' : code.startsWith('4') ? '#7f1d1d' : '#1e1e1e',
                      color: code === '429' ? '#fbbf24' : code.startsWith('4') ? '#fca5a5' : '#888',
                      border: '1px solid #333',
                    }}>
                      HTTP {code}: <strong>{count}</strong> {t.times}
                    </span>
                  ))}
                </div>
                {/* Per-key breakdown */}
                {p.keyErrors && p.keyErrors.length > 0 && (
                  <div style={{ marginLeft: '1rem', fontSize: '0.8rem', color: '#666' }}>
                    {p.keyErrors.map((ke) => (
                      <div key={ke.keyHash} style={{ marginBottom: '0.3rem' }}>
                        <span style={{ fontFamily: 'monospace', color: '#888' }}>
                          key:{ke.keyHash.slice(0, 8)}
                        </span>
                        {Object.entries(ke.errors).map(([code, detail]) => (
                          <span key={code} style={{ marginLeft: '0.8rem' }}>
                            <span style={{ color: '#f87171' }}>{code}×{detail.count}</span>
                            {detail.reason && (
                              <span style={{ color: '#555', marginLeft: '0.3rem' }}>
                                — {detail.reason}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </section>
      )}

      {/* Temporary API Key Generator */}
      <section style={{
        padding: '1.5rem', borderRadius: '12px', border: '1px solid #333',
        backgroundColor: '#111', marginBottom: '1.5rem',
      }}>
        <h2 style={{ fontSize: '1.2rem', marginTop: 0 }}>{t.tempKeyTitle}</h2>
        <p style={{ fontSize: '0.85rem', color: '#888', marginTop: '-0.5rem', marginBottom: '1.2rem' }}>
          {t.tempKeyDesc}
        </p>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#ccc', fontSize: '0.9rem' }}>{t.tempDurationLabel}</span>
            <select
              value={tempDuration}
              onChange={(e) => setTempDuration(Number(e.target.value))}
              disabled={tempKeyLoading}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: '1px solid #333',
                backgroundColor: '#18181b',
                color: '#fff',
                fontSize: '0.9rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value={3600}>{t.duration1h}</option>
              <option value={86400}>{t.duration1d}</option>
              <option value={604800}>{t.duration7d}</option>
              <option value={2592000}>{t.duration30d}</option>
            </select>
          </div>

          <button
            onClick={handleGenerateTempKey}
            disabled={tempKeyLoading}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#10b981',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              cursor: tempKeyLoading ? 'wait' : 'pointer',
              opacity: tempKeyLoading ? 0.6 : 1,
            }}
          >
            {tempKeyLoading ? '...' : t.generateBtn}
          </button>
        </div>

        {tempKeyMessage && (
          <p style={{
            color: tempKeyMessage.type === 'error' ? '#ef4444' : '#10b981',
            fontSize: '0.9rem',
            margin: '0.5rem 0'
          }}>
            {tempKeyMessage.text}
          </p>
        )}

        {generatedKey && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            borderRadius: '8px',
            backgroundColor: '#0a0a0c',
            border: '1px solid #222',
          }}>
            <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.5rem' }}>{t.generatedKeyLabel}</div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                readOnly
                value={generatedKey}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  borderRadius: '4px',
                  border: '1px solid #333',
                  backgroundColor: '#18181b',
                  color: '#10b981',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleCopy}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  border: '1px solid #10b981',
                  backgroundColor: 'transparent',
                  color: '#10b981',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                }}
              >
                {copied ? t.copied : t.copy}
              </button>
            </div>
            {generatedKeyExpires && (
              <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
                {t.expiresAtLabel} <code>{new Date(generatedKeyExpires).toLocaleString()}</code>
              </div>
            )}
          </div>
        )}

        <div style={{
          marginTop: '1rem',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          backgroundColor: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.15)',
          color: '#f87171',
          fontSize: '0.85rem',
          lineHeight: '1.4'
        }}>
          {t.tempKeyNotice}
        </div>
      </section>

      {/* Provider Key Pools */}
      <section style={{
        padding: '1.5rem', borderRadius: '12px', border: '1px solid #333',
        backgroundColor: '#111',
      }}>
        <style dangerouslySetInnerHTML={{ __html: `
          .provider-row {
            transition: all 0.2s ease;
            cursor: pointer;
          }
          .provider-row:hover {
            background-color: #1e1e24 !important;
          }
          .provider-row.selected {
            background-color: #1e293b !important;
            border-left: 3px solid #3b82f6 !important;
          }
          .config-card {
            animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          }
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .fallback-item {
            transition: all 0.2s ease;
          }
          .fallback-item:hover {
            background-color: #1a1a24 !important;
          }
        `}} />
        <h2 style={{ fontSize: '1.2rem', marginTop: 0 }}>{t.providerKeyPools}</h2>
        <p style={{ fontSize: '0.85rem', color: '#888', marginTop: '-0.5rem', marginBottom: '1.2rem' }}>
          {t.providerKeyPoolsDesc}
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #333' }}>
              <th style={{ textAlign: 'left', padding: '0.6rem', color: '#888' }}>{t.tblProvider}</th>
              <th style={{ textAlign: 'center', padding: '0.6rem', color: '#888' }}>{t.tblStatus}</th>
              <th style={{ textAlign: 'center', padding: '0.6rem', color: '#888' }}>{t.tblKeys}</th>
              <th style={{ textAlign: 'center', padding: '0.6rem', color: '#888' }}>{t.tblAvailable}</th>
              <th style={{ textAlign: 'left', padding: '0.6rem', color: '#888' }}>{t.tblModelPrefixes}</th>
            </tr>
          </thead>
          <tbody>
            {data!.providers.map((p) => {
              const isSelected = selectedProvider === p.id;
              return (
                <tr
                  key={p.id}
                  className={`provider-row ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedProvider(isSelected ? null : p.id)}
                  style={{
                    borderBottom: '1px solid #222',
                    backgroundColor: isSelected ? '#1e293b' : 'transparent',
                  }}
                >
                  <td style={{ padding: '0.6rem', fontWeight: 'bold' }}>
                    {isSelected ? '👉 ' : ''}{p.name}
                  </td>
                  <td style={{ padding: '0.6rem', textAlign: 'center' }}>
                    <span style={{
                      padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem',
                      backgroundColor: p.configured ? '#064e3b' : '#7f1d1d',
                      color: p.configured ? '#34d399' : '#fca5a5',
                    }}>
                      {p.configured ? t.statusOk : t.statusNoKeys}
                    </span>
                  </td>
                  <td style={{ padding: '0.6rem', textAlign: 'center' }}>{p.keyCount}</td>
                  <td style={{ padding: '0.6rem', textAlign: 'center' }}>
                    <span style={{
                      color: p.availableKeys > 0 ? '#34d399' : '#ef4444',
                      fontWeight: 'bold',
                    }}>
                      {p.availableKeys}
                    </span>
                  </td>
                  <td style={{
                    padding: '0.6rem', fontFamily: 'monospace', fontSize: '0.85rem',
                    color: '#888',
                  }}>
                    {p.modelPrefixes.join(', ')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Provider Config Editor Panel */}
      {selectedProvider && (
        <section
          className="config-card"
          style={{
            marginTop: '1.5rem',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid #3b82f6',
            backgroundColor: '#111',
            boxShadow: '0 4px 20px rgba(59, 130, 246, 0.15)',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #333',
            paddingBottom: '1rem',
            marginBottom: '1.5rem',
          }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ⚙️ {t.configureTitle.replace('{name}', data!.providers.find(p => p.id === selectedProvider)?.name || selectedProvider)}
              </h2>
              <span style={{ fontSize: '0.85rem', color: '#888' }}>
                {t.providerIdLabel} <code style={{ color: '#60a5fa' }}>{selectedProvider}</code>
              </span>
            </div>
            <button
              onClick={() => setSelectedProvider(null)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #444',
                backgroundColor: 'transparent',
                color: '#aaa',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              {t.btnClose}
            </button>
          </div>

          {/* Config Loading / Message */}
          {operationLoading && !providerKeys && !providerFallbacks && (
            <div style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>
              {t.loadingConfig}
            </div>
          )}

          {configMessage && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              fontSize: '0.9rem',
              border: configMessage.type === 'success' ? '1px solid #059669' : '1px solid #dc2626',
              backgroundColor: configMessage.type === 'success' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(220, 38, 38, 0.1)',
              color: configMessage.type === 'success' ? '#34d399' : '#f87171',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span>{configMessage.text}</span>
              <button
                onClick={() => setConfigMessage(null)}
                style={{
                  background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem'
                }}
              >
                ×
              </button>
            </div>
          )}

          {/* Core Configuration Content */}
          {(providerKeys || providerFallbacks) && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '2rem',
            }}>

              {/* Column 1: API Key Pool */}
              <div>
                <h3 style={{ fontSize: '1.1rem', marginTop: 0, marginBottom: '0.75rem', color: '#e0e0e0' }}>
                  {t.apiKeyPoolTitle}
                </h3>

                {/* Overriding Info Warning */}
                <div style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(245, 158, 11, 0.05)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  color: '#fbbf24',
                  fontSize: '0.85rem',
                  lineHeight: '1.4',
                  marginBottom: '1rem',
                }}>
                  {providerKeys && providerKeys.length > 0 && providerKeys[0].source === 'managed' ? (
                    <span>
                      {t.kvWarningManaged}
                    </span>
                  ) : (
                    <span>
                      {t.kvWarningEnv}
                    </span>
                  )}
                </div>

                {/* Add Key Form */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <input
                    type="password"
                    placeholder={t.addKeyPlaceholder}
                    value={newKeyInput}
                    onChange={(e) => setNewKeyInput(e.target.value)}
                    disabled={operationLoading}
                    style={{
                      flex: 1,
                      padding: '0.6rem 0.8rem',
                      borderRadius: '6px',
                      border: '1px solid #333',
                      backgroundColor: '#18181b',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={handleAddKey}
                    disabled={operationLoading || !newKeyInput.trim()}
                    style={{
                      padding: '0.6rem 1rem',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      cursor: operationLoading || !newKeyInput.trim() ? 'not-allowed' : 'pointer',
                      opacity: operationLoading || !newKeyInput.trim() ? 0.6 : 1,
                    }}
                  >
                    {t.btnAddKey}
                  </button>
                </div>

                {/* Keys list */}
                <div style={{
                  border: '1px solid #222',
                  borderRadius: '8px',
                  backgroundColor: '#0a0a0c',
                  maxHeight: '250px',
                  overflowY: 'auto',
                }}>
                  {providerKeys && providerKeys.length > 0 ? (
                    providerKeys.map((key) => {
                      const isEnv = key.source === 'env';
                      return (
                        <div
                          key={key.hash}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.6rem 0.8rem',
                            borderBottom: '1px solid #1c1c1f',
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <code style={{ fontSize: '0.9rem', color: '#e0e0e0', fontFamily: 'monospace' }}>
                              {key.masked}
                            </code>
                            <span style={{ fontSize: '0.75rem', color: '#666' }}>
                              {t.keyHashLabel} <code>{key.hash.slice(0, 8)}</code>
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                              fontSize: '0.75rem',
                              padding: '0.15rem 0.4rem',
                              borderRadius: '4px',
                              backgroundColor: isEnv ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                              color: isEnv ? '#60a5fa' : '#34d399',
                              border: isEnv ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)',
                            }}>
                              {isEnv ? t.keySourceEnv : t.keySourceKv}
                            </span>

                            <button
                              onClick={() => handleDeleteKey(key.hash)}
                              disabled={operationLoading || isEnv}
                              style={{
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                border: '1px solid #dc2626',
                                backgroundColor: 'transparent',
                                color: '#ef4444',
                                fontSize: '0.75rem',
                                cursor: operationLoading || isEnv ? 'not-allowed' : 'pointer',
                                opacity: isEnv ? 0.4 : 1,
                              }}
                              title={isEnv ? t.deleteEnvKeyTitle : t.deleteKvKeyTitle}
                            >
                              {t.btnDeleteKey}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ color: '#555', fontSize: '0.9rem', padding: '1.5rem', textAlign: 'center' }}>
                      {t.noKeysConfigured}
                    </div>
                  )}
                </div>
              </div>

              {/* Column 2: Fallback Chain */}
              <div>
                <h3 style={{ fontSize: '1.1rem', marginTop: 0, marginBottom: '0.75rem', color: '#e0e0e0' }}>
                  {t.fallbackChainTitle}
                </h3>

                {/* Static / Managed indicator */}
                <div style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(59, 130, 246, 0.05)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  color: '#60a5fa',
                  fontSize: '0.85rem',
                  lineHeight: '1.4',
                  marginBottom: '1rem',
                }}>
                  {providerFallbacks?.isOverride ? (
                    <span>
                      {t.kvFallbackActive}
                    </span>
                  ) : (
                    <span>
                      {t.kvFallbackStatic}
                    </span>
                  )}
                </div>

                {/* Reorderable Chain List */}
                <div style={{
                  border: '1px solid #222',
                  borderRadius: '8px',
                  backgroundColor: '#0a0a0c',
                  marginBottom: '1rem',
                  padding: '0.25rem 0',
                }}>
                  {activeFallbacks.length > 0 ? (
                    activeFallbacks.map((fbEntry, idx) => {
                      const colonIdx = fbEntry.indexOf(':');
                      const fbId = colonIdx >= 0 ? fbEntry.slice(0, colonIdx) : fbEntry;
                      const fbModel = colonIdx >= 0 ? fbEntry.slice(colonIdx + 1) : '';
                      const fbName = data?.providers.find(p => p.id === fbId)?.name || fbId;
                      const models = providerFallbacks?.availableModels?.[fbId] || [];
                      return (
                        <div
                          key={`${fbEntry}-${idx}`}
                          className="fallback-item"
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.5rem 0.8rem',
                            borderBottom: idx < activeFallbacks.length - 1 ? '1px solid #1c1c1f' : 'none',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                            <span style={{
                              color: '#666',
                              fontSize: '0.8rem',
                              fontFamily: 'monospace',
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              backgroundColor: '#1c1c1f',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}>{idx + 1}</span>
                            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', flexShrink: 0 }}>{fbName}</span>
                            {/* Model selector */}
                            <select
                              value={fbModel}
                              onChange={(e) => {
                                const newList = [...activeFallbacks];
                                newList[idx] = e.target.value ? `${fbId}:${e.target.value}` : fbId;
                                setActiveFallbacks(newList);
                              }}
                              disabled={operationLoading}
                              style={{
                                padding: '0.2rem 0.4rem',
                                borderRadius: '4px',
                                border: '1px solid #333',
                                backgroundColor: '#18181b',
                                color: fbModel ? '#60a5fa' : '#666',
                                fontSize: '0.75rem',
                                outline: 'none',
                                maxWidth: '180px',
                                flexShrink: 1,
                              }}
                            >
                              <option value="">{t.modelSelectorAuto}</option>
                              {models.map(m => (
                                <option key={m.id} value={m.id}>{m.displayName}</option>
                              ))}
                            </select>
                          </div>

                          <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                            {/* Up button */}
                            <button
                              onClick={() => {
                                if (idx === 0) return;
                                const nextList = [...activeFallbacks];
                                const tmp = nextList[idx];
                                nextList[idx] = nextList[idx - 1];
                                nextList[idx - 1] = tmp;
                                setActiveFallbacks(nextList);
                              }}
                              disabled={idx === 0 || operationLoading}
                              style={{
                                padding: '0.2rem 0.4rem',
                                borderRadius: '4px',
                                border: '1px solid #333',
                                backgroundColor: '#18181b',
                                color: '#aaa',
                                fontSize: '0.75rem',
                                cursor: idx === 0 || operationLoading ? 'not-allowed' : 'pointer',
                              }}
                            >
                              ▲
                            </button>
                            {/* Down button */}
                            <button
                              onClick={() => {
                                if (idx === activeFallbacks.length - 1) return;
                                const nextList = [...activeFallbacks];
                                const tmp = nextList[idx];
                                nextList[idx] = nextList[idx + 1];
                                nextList[idx + 1] = tmp;
                                setActiveFallbacks(nextList);
                              }}
                              disabled={idx === activeFallbacks.length - 1 || operationLoading}
                              style={{
                                padding: '0.2rem 0.4rem',
                                borderRadius: '4px',
                                border: '1px solid #333',
                                backgroundColor: '#18181b',
                                color: '#aaa',
                                fontSize: '0.75rem',
                                cursor: idx === activeFallbacks.length - 1 || operationLoading ? 'not-allowed' : 'pointer',
                              }}
                            >
                              ▼
                            </button>
                            {/* Remove button */}
                            <button
                              onClick={() => {
                                const nextList = activeFallbacks.filter((_, i) => i !== idx);
                                setActiveFallbacks(nextList);
                              }}
                              disabled={operationLoading}
                              style={{
                                padding: '0.2rem 0.4rem',
                                borderRadius: '4px',
                                border: '1px solid #7f1d1d',
                                backgroundColor: 'transparent',
                                color: '#f87171',
                                fontSize: '0.75rem',
                                cursor: operationLoading ? 'not-allowed' : 'pointer',
                              }}
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ color: '#555', fontSize: '0.9rem', padding: '1.5rem', textAlign: 'center' }}>
                      {t.noFallbacksConfigured}
                    </div>
                  )}
                </div>

                {/* Add Fallback Form */}
                {(() => {
                  const usedProviders = activeFallbacks.map(fb => {
                    const ci = fb.indexOf(':');
                    return ci >= 0 ? fb.slice(0, ci) : fb;
                  });
                  const availableToAdd = data?.providers.filter(p => p.id !== selectedProvider && !usedProviders.includes(p.id)) || [];
                  return availableToAdd.length > 0 ? (
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <select
                      value={selectedFallbackToAdd}
                      onChange={(e) => setSelectedFallbackToAdd(e.target.value)}
                      disabled={operationLoading}
                      style={{
                        flex: 1,
                        padding: '0.5rem 0.8rem',
                        borderRadius: '6px',
                        border: '1px solid #333',
                        backgroundColor: '#18181b',
                        color: '#fff',
                        fontSize: '0.85rem',
                        outline: 'none',
                      }}
                    >
                      {availableToAdd.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.id})
                          </option>
                        ))}
                    </select>
                    <button
                      onClick={() => {
                        if (!selectedFallbackToAdd) return;
                        setActiveFallbacks([...activeFallbacks, selectedFallbackToAdd]);
                      }}
                      disabled={operationLoading || !selectedFallbackToAdd}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        border: '1px solid #444',
                        backgroundColor: '#1c1c1f',
                        color: '#eee',
                        fontSize: '0.85rem',
                        cursor: operationLoading || !selectedFallbackToAdd ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {t.btnAddFallback}
                    </button>
                  </div>
                  ) : (
                    <div style={{ color: '#555', fontSize: '0.8rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                      {t.noOtherProviders}
                    </div>
                  );
                })()}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  {providerFallbacks?.isOverride && (
                    <button
                      onClick={handleResetFallbacks}
                      disabled={operationLoading}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        border: '1px solid #7f1d1d',
                        backgroundColor: 'transparent',
                        color: '#f87171',
                        fontSize: '0.9rem',
                        cursor: operationLoading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {t.btnResetFallbacks}
                    </button>
                  )}
                  <button
                    onClick={() => handleSaveFallbacks(activeFallbacks)}
                    disabled={operationLoading || JSON.stringify(activeFallbacks) === JSON.stringify(providerFallbacks?.current)}
                    style={{
                      padding: '0.5rem 1.25rem',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      cursor: operationLoading || JSON.stringify(activeFallbacks) === JSON.stringify(providerFallbacks?.current) ? 'not-allowed' : 'pointer',
                      opacity: operationLoading || JSON.stringify(activeFallbacks) === JSON.stringify(providerFallbacks?.current) ? 0.6 : 1,
                    }}
                  >
                    {t.btnSaveFallbacks}
                  </button>
                </div>
              </div>

            </div>
          )}
        </section>
      )}

      <p style={{
        color: '#555', marginTop: '2rem', fontSize: '0.8rem', textAlign: 'center',
      }}>
        {t.autoRefreshInfo} {new Date(data!.timestamp).toLocaleTimeString()}
      </p>
    </main>
  );
}
