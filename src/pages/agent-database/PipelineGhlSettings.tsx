import React, { useState, useEffect } from 'react';
import { X, Wifi, WifiOff, AlertTriangle, Save, Loader2, TestTube, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { AgentPipelineGhlConfig, AgentPipelineStageMap } from '../../lib/supabase';

interface PipelineGhlSettingsProps {
  onClose: () => void;
}

const SETTINGS_PASSWORD = 'CRMBadasses!';

export const PipelineGhlSettings: React.FC<PipelineGhlSettingsProps> = ({ onClose }) => {
  const [authenticated, setAuthenticated] = useState(() => {
    return sessionStorage.getItem('pipeline_ghl_auth') === 'true';
  });
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [config, setConfig] = useState<AgentPipelineGhlConfig | null>(null);
  const [stageMap, setStageMap] = useState<AgentPipelineStageMap[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [locationId, setLocationId] = useState('');
  const [pipelineId, setPipelineId] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [stageEdits, setStageEdits] = useState<Record<string, string>>({});

  useEffect(() => {
    if (authenticated) loadConfig();
  }, [authenticated]);

  const loadConfig = async () => {
    const { data: configData } = await supabase
      .from('agent_pipeline_ghl_config')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (configData) {
      setConfig(configData);
      setApiKey(configData.ghl_api_key);
      setLocationId(configData.ghl_location_id);
      setPipelineId(configData.ghl_pipeline_id);
    }

    const { data: mapData } = await supabase
      .from('agent_pipeline_stage_map')
      .select('*')
      .order('display_order', { ascending: true });

    if (mapData) {
      setStageMap(mapData);
      const edits: Record<string, string> = {};
      mapData.forEach(m => { edits[m.id] = m.ghl_stage_id || ''; });
      setStageEdits(edits);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === SETTINGS_PASSWORD) {
      setAuthenticated(true);
      sessionStorage.setItem('pipeline_ghl_auth', 'true');
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const now = new Date().toISOString();

    if (config) {
      await supabase
        .from('agent_pipeline_ghl_config')
        .update({
          ghl_api_key: apiKey,
          ghl_location_id: locationId,
          ghl_pipeline_id: pipelineId,
          updated_at: now,
        })
        .eq('id', config.id);
    } else {
      const { data } = await supabase
        .from('agent_pipeline_ghl_config')
        .insert({
          ghl_api_key: apiKey,
          ghl_location_id: locationId,
          ghl_pipeline_id: pipelineId,
        })
        .select()
        .maybeSingle();
      if (data) setConfig(data);
    }

    // Save stage map GHL IDs
    for (const stage of stageMap) {
      const newId = stageEdits[stage.id] || '';
      if (newId !== (stage.ghl_stage_id || '')) {
        await supabase
          .from('agent_pipeline_stage_map')
          .update({ ghl_stage_id: newId || null })
          .eq('id', stage.id);
      }
    }

    await loadConfig();
    setSaving(false);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch(`https://services.leadconnectorhq.com/locations/${locationId}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Version: '2021-07-28',
        },
      });

      if (res.ok) {
        setTestResult({ success: true, message: 'Connection successful!' });
        // Update config status
        if (config) {
          await supabase
            .from('agent_pipeline_ghl_config')
            .update({ connection_status: 'connected', last_error: null, updated_at: new Date().toISOString() })
            .eq('id', config.id);
          setConfig({ ...config, connection_status: 'connected', last_error: null });
        }
      } else {
        const errText = await res.text();
        setTestResult({ success: false, message: `Failed (${res.status}): ${errText.slice(0, 100)}` });
        if (config) {
          await supabase
            .from('agent_pipeline_ghl_config')
            .update({ connection_status: 'error', last_error: `HTTP ${res.status}`, updated_at: new Date().toISOString() })
            .eq('id', config.id);
          setConfig({ ...config, connection_status: 'error', last_error: `HTTP ${res.status}` });
        }
      }
    } catch (err) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : 'Network error' });
    }

    setTesting(false);
  };

  if (!authenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-navy-100 flex items-center justify-center">
                <Lock className="w-5 h-5 text-navy-600" />
              </div>
              <h2 className="text-lg font-bold text-steel-900">GHL Settings</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-steel-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-steel-500" />
            </button>
          </div>
          <form onSubmit={handlePasswordSubmit}>
            <label className="block text-sm font-medium text-steel-700 mb-2">Enter password to access settings</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
              placeholder="Password..."
              className="w-full px-4 py-2.5 border border-steel-200 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              autoFocus
            />
            {passwordError && <p className="text-red-600 text-sm mt-2">{passwordError}</p>}
            <button
              type="submit"
              className="mt-4 w-full px-4 py-2.5 bg-navy-600 text-white rounded-lg font-medium text-sm hover:bg-navy-700 transition-colors"
            >
              Unlock
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-steel-200 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-navy-100 flex items-center justify-center">
              <Wifi className="w-5 h-5 text-navy-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-steel-900">GHL Pipeline Connection</h2>
              <div className="flex items-center gap-2 mt-0.5">
                {config?.connection_status === 'connected' ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <Wifi className="w-3 h-3" /> Connected
                  </span>
                ) : config?.connection_status === 'error' ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                    <AlertTriangle className="w-3 h-3" /> Error
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-steel-500 bg-steel-100 px-2 py-0.5 rounded-full">
                    <WifiOff className="w-3 h-3" /> Disconnected
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-steel-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-steel-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Connection Fields */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-steel-500">Connection Details</h3>
            <div>
              <label className="block text-sm font-medium text-steel-700 mb-1">GHL API Key</label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter GHL API key..."
                  className="w-full px-4 py-2.5 pr-10 border border-steel-200 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-400 hover:text-steel-600"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-steel-700 mb-1">Location ID</label>
                <input
                  type="text"
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  placeholder="e.g. abc123..."
                  className="w-full px-4 py-2.5 border border-steel-200 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-steel-700 mb-1">Pipeline ID</label>
                <input
                  type="text"
                  value={pipelineId}
                  onChange={(e) => setPipelineId(e.target.value)}
                  placeholder="e.g. xyz789..."
                  className="w-full px-4 py-2.5 border border-steel-200 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent font-mono"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleTestConnection}
                disabled={testing || !apiKey || !locationId}
                className="flex items-center gap-2 px-4 py-2 border border-steel-200 rounded-lg text-sm font-medium text-steel-700 hover:bg-steel-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
                Test Connection
              </button>
              {testResult && (
                <span className={`text-sm font-medium ${testResult.success ? 'text-emerald-600' : 'text-red-600'}`}>
                  {testResult.message}
                </span>
              )}
            </div>
          </div>

          {/* Stage Mapping */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-steel-500">
              Stage Mapping (GHL Stage IDs)
            </h3>
            <p className="text-xs text-steel-400">
              These are auto-learned from incoming webhooks. You can also paste them manually.
            </p>
            <div className="grid grid-cols-1 gap-2 max-h-[280px] overflow-y-auto pr-2">
              {stageMap.map(stage => (
                <div key={stage.id} className="flex items-center gap-3 py-1.5">
                  <span className="text-sm text-steel-700 w-44 flex-shrink-0 truncate font-medium">
                    {stage.ghl_stage_name}
                  </span>
                  <input
                    type="text"
                    value={stageEdits[stage.id] || ''}
                    onChange={(e) => setStageEdits(prev => ({ ...prev, [stage.id]: e.target.value }))}
                    placeholder="GHL stage UUID..."
                    className="flex-1 px-3 py-1.5 border border-steel-200 rounded-md text-xs font-mono focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                  />
                  {stageEdits[stage.id] && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" title="Mapped" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-steel-100">
            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-steel-200 rounded-lg text-sm font-medium text-steel-700 hover:bg-steel-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 bg-navy-600 text-white rounded-lg font-medium text-sm hover:bg-navy-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
