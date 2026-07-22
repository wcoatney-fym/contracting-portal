import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle, XCircle,
  Loader2, Download, Users,
} from 'lucide-react';

interface RosterRow {
  first_name: string;
  last_name: string;
  npn: string;
  email?: string;
  phone?: string;
  agency?: string;
  resident_state?: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: number;
  details: { row: number; name: string; npn: string; status: 'imported' | 'skipped' | 'error'; reason?: string }[];
}

const REQUIRED_FIELDS = ['first_name', 'last_name', 'npn'];

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const rows = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  });

  return { headers, rows };
}

function normalizeHeaders(headers: string[]): Map<string, string> {
  const map = new Map<string, string>();
  const aliases: Record<string, string[]> = {
    first_name: ['first_name', 'firstname', 'first', 'agent_first_name'],
    last_name: ['last_name', 'lastname', 'last', 'agent_last_name'],
    npn: ['npn', 'agent_npn', 'national_producer_number'],
    email: ['email', 'agent_email', 'email_address'],
    phone: ['phone', 'agent_phone', 'phone_number', 'cell', 'mobile'],
    agency: ['agency', 'agency_name', 'sub_agency'],
    resident_state: ['resident_state', 'state', 'home_state'],
  };

  for (const h of headers) {
    for (const [canonical, alts] of Object.entries(aliases)) {
      if (alts.includes(h)) {
        map.set(h, canonical);
        break;
      }
    }
  }
  return map;
}

export const RosterImport: React.FC = () => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ headers: string[]; rows: Record<string, string>[]; headerMap: Map<string, string> } | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setResult(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Please upload a .csv file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers, rows } = parseCSV(text);

      if (rows.length === 0) {
        setError('No data rows found in the CSV.');
        return;
      }

      const headerMap = normalizeHeaders(headers);
      const mapped = Array.from(headerMap.values());
      const missing = REQUIRED_FIELDS.filter(f => !mapped.includes(f));

      if (missing.length > 0) {
        setError(`Missing required columns: ${missing.join(', ')}. Found: ${headers.join(', ')}`);
        return;
      }

      setPreview({ headers, rows, headerMap });
    };
    reader.readAsText(file);
  };

  const getMappedValue = (row: Record<string, string>, field: string): string => {
    if (!preview) return '';
    for (const [rawHeader, canonical] of preview.headerMap.entries()) {
      if (canonical === field) return row[rawHeader]?.trim() || '';
    }
    return '';
  };

  const handleImport = async () => {
    if (!preview) return;
    setImporting(true);
    setError('');

    const details: ImportResult['details'] = [];
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < preview.rows.length; i++) {
      const row = preview.rows[i];
      const firstName = getMappedValue(row, 'first_name');
      const lastName = getMappedValue(row, 'last_name');
      const npn = getMappedValue(row, 'npn');
      const email = getMappedValue(row, 'email') || null;
      const phone = getMappedValue(row, 'phone') || null;
      const agency = getMappedValue(row, 'agency') || 'FYM';
      const residentState = getMappedValue(row, 'resident_state') || null;
      const name = `${firstName} ${lastName}`;

      if (!firstName || !lastName || !npn) {
        errors++;
        details.push({ row: i + 2, name: name.trim() || '(empty)', npn: npn || '(empty)', status: 'error', reason: 'Missing required field' });
        continue;
      }

      try {
        // Check for existing agent by NPN
        const { data: existing } = await supabase
          .from('agents')
          .select('id, first_name, last_name, npn')
          .eq('npn', npn)
          .maybeSingle();

        if (existing) {
          skipped++;
          details.push({ row: i + 2, name, npn, status: 'skipped', reason: `Duplicate NPN — matches ${existing.first_name} ${existing.last_name}` });
          continue;
        }

        // Also check agent_intake for NPN (in case agents.npn hasn't been backfilled yet)
        const { data: intakeMatch } = await supabase
          .from('agent_intake')
          .select('agent_id, npn')
          .eq('npn', npn)
          .maybeSingle();

        if (intakeMatch) {
          skipped++;
          details.push({ row: i + 2, name, npn, status: 'skipped', reason: 'NPN already exists in intake records' });
          continue;
        }

        // Insert new agent
        const { data: newAgent, error: insertErr } = await supabase
          .from('agents')
          .insert({
            first_name: firstName,
            last_name: lastName,
            npn,
            email,
            phone,
            agency,
            resident_state: residentState,
            source: 'roster_import',
            status: 'completed',
            crm_onboarded: true,
          })
          .select('id')
          .maybeSingle();

        if (insertErr || !newAgent) {
          errors++;
          const reason = insertErr?.message?.includes('idx_agents_npn_unique')
            ? 'Duplicate NPN (conflict on insert)'
            : insertErr?.message || 'Insert failed';
          details.push({ row: i + 2, name, npn, status: 'error', reason });
          continue;
        }

        // Auto-generate hub token
        const agentSlug = [firstName, lastName, npn]
          .map(s => s.toLowerCase().replace(/[^a-z0-9]/g, ''))
          .filter(Boolean)
          .join('-');

        await supabase.from('agent_hub_tokens').insert({
          agent_id: newAgent.id,
          npn,
          agent_slug: agentSlug || null,
        });

        imported++;
        details.push({ row: i + 2, name, npn, status: 'imported' });
      } catch (err: any) {
        errors++;
        details.push({ row: i + 2, name, npn, status: 'error', reason: err?.message || 'Unknown error' });
      }
    }

    setResult({ imported, skipped, errors, details });
    setImporting(false);
  };

  const handleReset = () => {
    setPreview(null);
    setResult(null);
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const downloadTemplate = () => {
    const csv = 'first_name,last_name,npn,email,phone,agency,resident_state\nJohn,Smith,12345678,john@email.com,555-123-4567,DH Insurance,Georgia\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agent_roster_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Agent Roster</h1>
          <p className="text-sm text-gray-500 mt-1">
            Upload a CSV of historical agents to add them to the Agent Database. Duplicates are detected by NPN.
          </p>
        </div>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          <Download className="w-4 h-4" /> Download Template
        </button>
      </div>

      {/* Upload area */}
      {!preview && !result && (
        <div
          className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center cursor-pointer hover:border-navy-400 hover:bg-navy-50/30 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-700">Click to upload CSV</p>
          <p className="text-xs text-gray-400 mt-1">
            Required columns: first_name, last_name, npn · Optional: email, phone, agency, resident_state
          </p>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Preview */}
      {preview && !result && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-5 h-5 text-navy-600" />
              <div>
                <p className="text-sm font-bold text-gray-900">{preview.rows.length} agents ready to import</p>
                <p className="text-xs text-gray-500">
                  Mapped: {Array.from(new Set(preview.headerMap.values())).join(', ')}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={importing}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-navy-700 text-white text-sm font-semibold hover:bg-navy-800 disabled:opacity-50"
              >
                {importing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</>
                ) : (
                  <><Users className="w-4 h-4" /> Import {preview.rows.length} Agents</>
                )}
              </button>
            </div>
          </div>

          {/* Preview table — first 10 rows */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Row</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">First Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Last Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">NPN</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Email</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Agency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {preview.rows.slice(0, 10).map((row, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-gray-400">{i + 2}</td>
                    <td className="px-4 py-2 font-medium text-gray-900">{getMappedValue(row, 'first_name')}</td>
                    <td className="px-4 py-2 text-gray-700">{getMappedValue(row, 'last_name')}</td>
                    <td className="px-4 py-2 text-gray-700">{getMappedValue(row, 'npn')}</td>
                    <td className="px-4 py-2 text-gray-500">{getMappedValue(row, 'email') || '—'}</td>
                    <td className="px-4 py-2 text-gray-500">{getMappedValue(row, 'agency') || 'FYM'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.rows.length > 10 && (
              <p className="px-4 py-2 text-xs text-gray-400 bg-gray-50">
                …and {preview.rows.length - 10} more rows
              </p>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 text-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-emerald-700">{result.imported}</p>
              <p className="text-xs text-emerald-600 font-medium">Imported</p>
            </div>
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-center">
              <AlertCircle className="w-6 h-6 text-amber-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-amber-700">{result.skipped}</p>
              <p className="text-xs text-amber-600 font-medium">Skipped (duplicate)</p>
            </div>
            <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-center">
              <XCircle className="w-6 h-6 text-red-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-red-700">{result.errors}</p>
              <p className="text-xs text-red-600 font-medium">Errors</p>
            </div>
          </div>

          {/* Detail table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-900">Import Details</p>
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-xl bg-navy-700 text-white text-sm font-semibold hover:bg-navy-800"
              >
                Import Another
              </button>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Row</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">NPN</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {result.details.map((d, i) => (
                    <tr key={i} className={d.status === 'error' ? 'bg-red-50/30' : d.status === 'skipped' ? 'bg-amber-50/30' : ''}>
                      <td className="px-4 py-2 text-gray-400">{d.row}</td>
                      <td className="px-4 py-2 font-medium text-gray-900">{d.name}</td>
                      <td className="px-4 py-2 text-gray-700">{d.npn}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg ${
                          d.status === 'imported' ? 'bg-emerald-100 text-emerald-700' :
                          d.status === 'skipped' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {d.status === 'imported' ? <CheckCircle2 className="w-3 h-3" /> :
                           d.status === 'skipped' ? <AlertCircle className="w-3 h-3" /> :
                           <XCircle className="w-3 h-3" />}
                          {d.status.charAt(0).toUpperCase() + d.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500">{d.reason || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
