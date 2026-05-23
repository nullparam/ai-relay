'use client';

import React, { useState } from 'react';
import type { WebhookConfig } from '../types';

interface WebhookListProps {
  apiKey: string;
  lang: 'zh' | 'en';
  i: any;
  webhooks: WebhookConfig[];
  fetchSettings: () => Promise<void>;
  onRefreshData?: () => Promise<void>;
}

const PLATFORM_OPTIONS = [
  { value: 'wecom', label: '企业微信 (WeCom)', emoji: '💬' },
  { value: 'feishu', label: '飞书 (Feishu)', emoji: '🐦' },
  { value: 'dingtalk', label: '钉钉 (DingTalk)', emoji: '🔔' },
  { value: 'slack', label: 'Slack', emoji: '💼' },
  { value: 'generic', label: 'Generic (HTTP)', emoji: '🌐' },
] as const;

const PLATFORM_LABELS: Record<string, { zh: string; en: string; emoji: string }> = {
  wecom: { zh: '企业微信', en: 'WeCom', emoji: '💬' },
  feishu: { zh: '飞书', en: 'Feishu', emoji: '🐦' },
  dingtalk: { zh: '钉钉', en: 'DingTalk', emoji: '🔔' },
  slack: { zh: 'Slack', en: 'Slack', emoji: '💼' },
  generic: { zh: '通用 HTTP', en: 'Generic HTTP', emoji: '🌐' },
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 1rem',
  borderRadius: '6px',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  backgroundColor: 'rgba(0, 0, 0, 0.25)',
  color: '#fff',
  fontSize: '0.9rem',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};

const labelStyle: React.CSSProperties = {
  color: '#d1d5db',
  fontSize: '0.9rem',
  fontWeight: 500,
  marginBottom: '0.35rem',
  display: 'block',
};

const btnPrimary: React.CSSProperties = {
  padding: '0.5rem 1.5rem',
  borderRadius: '6px',
  border: 'none',
  backgroundColor: '#4361ee',
  color: 'white',
  fontWeight: 'bold',
  fontSize: '0.9rem',
  cursor: 'pointer',
  transition: 'all 0.2s',
  whiteSpace: 'nowrap',
};

const btnDanger: React.CSSProperties = {
  padding: '0.4rem 0.8rem',
  borderRadius: '6px',
  border: '1px solid rgba(239, 68, 68, 0.4)',
  backgroundColor: 'rgba(239, 68, 68, 0.1)',
  color: '#f87171',
  fontSize: '0.8rem',
  cursor: 'pointer',
  fontWeight: 'bold',
  transition: 'all 0.2s',
  whiteSpace: 'nowrap',
};

const btnOutline: React.CSSProperties = {
  padding: '0.4rem 0.8rem',
  borderRadius: '6px',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  backgroundColor: 'rgba(255, 255, 255, 0.04)',
  color: '#d1d5db',
  fontSize: '0.8rem',
  cursor: 'pointer',
  fontWeight: 500,
  transition: 'all 0.2s',
  whiteSpace: 'nowrap',
};

export default function WebhookList({
  apiKey,
  lang,
  i,
  webhooks,
  fetchSettings,
  onRefreshData,
}: WebhookListProps) {
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Add/Edit modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formPlatform, setFormPlatform] = useState<string>('wecom');
  const [formEnabled, setFormEnabled] = useState(true);
  const [formTemplate, setFormTemplate] = useState('');
  const [saving, setSaving] = useState(false);

  // Test states
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; error?: string } | null>(null);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormName('');
    setFormUrl('');
    setFormPlatform('wecom');
    setFormEnabled(true);
    setFormTemplate('');
  };

  const openAdd = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (wh: WebhookConfig) => {
    setEditingId(wh.id);
    setFormName(wh.name);
    setFormUrl(wh.url);
    setFormPlatform(wh.platform);
    setFormEnabled(wh.enabled);
    setFormTemplate(wh.template || '');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formUrl.trim()) return;
    setSaving(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const body: any = {
        name: formName.trim(),
        url: formUrl.trim(),
        platform: formPlatform,
        enabled: formEnabled,
      };
      if (formTemplate.trim()) body.template = formTemplate.trim();
      if (editingId) body.id = editingId;

      const res = await fetch('/api/admin/webhooks', {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Save failed');

      showMessage(i.webhookSaved, 'success');
      setModalOpen(false);
      resetForm();
      await fetchSettings();
      if (onRefreshData) await onRefreshData();
    } catch (e: any) {
      showMessage(`${i.saveFailed}: ${e.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(i.confirmDelete)) return;
    try {
      const res = await fetch('/api/admin/webhooks', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Delete failed');

      showMessage(i.webhookDeleted, 'success');
      await fetchSettings();
      if (onRefreshData) await onRefreshData();
    } catch (e: any) {
      showMessage(`${i.deleteFailed}: ${e.message}`, 'error');
    }
  };

  const handleTest = async (webhookId: string) => {
    setTestingId(webhookId);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/webhooks/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ webhookId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Test failed');
      setTestResult({ id: webhookId, success: true });
    } catch (e: any) {
      setTestResult({ id: webhookId, success: false, error: e.message });
    } finally {
      setTestingId(null);
    }
  };

  const handleToggleEnabled = async (wh: WebhookConfig) => {
    try {
      const res = await fetch('/api/admin/webhooks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ id: wh.id, enabled: !wh.enabled }),
      });
      if (!res.ok) throw new Error('Toggle failed');
      await fetchSettings();
    } catch {
      // silent
    }
  };

  return (
    <>
      <section className="glass-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', marginTop: 0, marginBottom: '0.5rem', color: '#fff', fontWeight: 600 }}>
            {i.sectionTitle}
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#9ca3af', margin: 0, lineHeight: '1.5' }}>
            {i.sectionDesc}
          </p>
        </div>
        <button
          onClick={openAdd}
          style={{
            ...btnPrimary,
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#3651d4'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#4361ee'; }}
        >
          {i.addWebhook}
        </button>
      </div>

      {/* Message banner */}
      {message && (
        <div style={{
          padding: '0.6rem 1rem',
          borderRadius: '8px',
          marginTop: '0.75rem',
          backgroundColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
          border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
          color: message.type === 'success' ? '#34d399' : '#f87171',
          fontSize: '0.9rem',
          fontWeight: 500,
        }}>
          {message.text}
        </div>
      )}

      {/* Webhook cards */}
      {webhooks.length === 0 ? (
        <div style={{
          marginTop: '1.25rem',
          padding: '1.5rem',
          borderRadius: '10px',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          border: '1px dashed rgba(255, 255, 255, 0.08)',
          color: '#6b7280',
          fontSize: '0.9rem',
          textAlign: 'center',
        }}>
          {i.noWebhooks}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem' }}>
          {webhooks.map((wh) => {
            const plat = PLATFORM_LABELS[wh.platform] || PLATFORM_LABELS.generic;
            const isTesting = testingId === wh.id;
            const result = testResult?.id === wh.id ? testResult : null;

            return (
              <div key={wh.id} className="wh-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  {/* Left: Info */}
                  <div style={{ flex: '1 1 auto', minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '1.1rem' }}>{plat.emoji}</span>
                      <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>{wh.name}</span>
                      <span style={{
                        fontSize: '0.7rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        backgroundColor: wh.enabled ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                        color: wh.enabled ? '#34d399' : '#6b7280',
                        fontWeight: 500,
                      }}>
                        {wh.enabled ? i.enabled : i.disabled}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#6b7280', fontFamily: 'monospace', wordBreak: 'break-all', marginBottom: '0.25rem' }}>
                      {wh.url.length > 70 ? wh.url.substring(0, 70) + '...' : wh.url}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#4b5563' }}>
                      {lang === 'zh' ? plat.zh : plat.en}
                      {wh.updatedAt && ` · ${i.updatedAt} ${new Date(wh.updatedAt).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US')}`}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                    {/* Toggle */}
                    <button
                      className={`toggle-switch ${wh.enabled ? 'active' : 'inactive'}`}
                      onClick={() => handleToggleEnabled(wh)}
                      title={wh.enabled ? i.enabled : i.disabled}
                    />

                    {/* Test */}
                    <button
                      onClick={() => handleTest(wh.id)}
                      disabled={isTesting}
                      style={{
                        ...btnOutline,
                        borderColor: result?.success === true ? 'rgba(16, 185, 129, 0.4)' : result?.success === false ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.12)',
                        color: result?.success === true ? '#34d399' : result?.success === false ? '#f87171' : '#d1d5db',
                        opacity: isTesting ? 0.6 : 1,
                        cursor: isTesting ? 'wait' : 'pointer',
                      }}
                      onMouseEnter={(e) => { if (!isTesting) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'; }}
                      onMouseLeave={(e) => { if (!isTesting) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)'; }}
                    >
                      {isTesting ? i.testing : result?.success === true ? i.testSuccess.substring(0, 6) : result?.success === false ? i.testFailed.substring(0, 6) : i.testWebhook}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => openEdit(wh)}
                      style={btnOutline}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)'; }}
                    >
                      ✏️ {i.editWebhook}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(wh.id)}
                      style={btnDanger}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Test error detail */}
                {result?.success === false && result.error && (
                  <div style={{
                    marginTop: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(239, 68, 68, 0.06)',
                    border: '1px solid rgba(239, 68, 68, 0.12)',
                    color: '#fca5a5',
                    fontSize: '0.8rem',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all',
                  }}>
                    {result.error}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </section>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setModalOpen(false); resetForm(); }}}>
          <div className="modal-content">
            <h3 style={{ fontSize: '1.15rem', color: '#fff', fontWeight: 600, margin: '0 0 1.5rem 0' }}>
              {editingId ? `✏️ ${i.editWebhook}` : i.addWebhook}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Name */}
              <div>
                <label style={labelStyle}>{i.nameLabel}</label>
                <input
                  type="text"
                  placeholder={i.namePlaceholder}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(67, 97, 238, 0.5)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
                />
              </div>

              {/* URL */}
              <div>
                <label style={labelStyle}>{i.urlLabel}</label>
                <input
                  type="url"
                  placeholder={i.urlPlaceholder}
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.85rem' }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(67, 97, 238, 0.5)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
                />
              </div>

              {/* Platform */}
              <div>
                <label style={labelStyle}>{i.platformLabel}</label>
                <select
                  value={formPlatform}
                  onChange={(e) => setFormPlatform(e.target.value)}
                  className="custom-select"
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {PLATFORM_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.emoji} {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Enabled toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>{i.enabledLabel}</label>
                <button
                  className={`toggle-switch ${formEnabled ? 'active' : 'inactive'}`}
                  onClick={() => setFormEnabled(!formEnabled)}
                  type="button"
                />
                <span style={{ fontSize: '0.8rem', color: formEnabled ? '#34d399' : '#6b7280' }}>
                  {formEnabled ? i.enabled : i.disabled}
                </span>
              </div>

              {/* Template (only for generic) */}
              {formPlatform === 'generic' && (
                <div>
                  <label style={labelStyle}>{i.templateLabel}</label>
                  <textarea
                    placeholder={i.templatePlaceholder}
                    value={formTemplate}
                    onChange={(e) => setFormTemplate(e.target.value)}
                    rows={4}
                    style={{
                      ...inputStyle,
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                      resize: 'vertical',
                      minHeight: '80px',
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(67, 97, 238, 0.5)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
                  />
                </div>
              )}
            </div>

            {/* Modal actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem' }}>
              <button
                onClick={() => { setModalOpen(false); resetForm(); }}
                style={btnOutline}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)'; }}
              >
                {i.cancel}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formName.trim() || !formUrl.trim()}
                style={{
                  ...btnPrimary,
                  opacity: (saving || !formName.trim() || !formUrl.trim()) ? 0.5 : 1,
                  cursor: saving ? 'wait' : 'pointer',
                }}
                onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#3651d4'; }}
                onMouseLeave={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#4361ee'; }}
              >
                {saving ? '...' : i.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
