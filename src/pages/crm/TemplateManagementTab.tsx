import React, { useState, useEffect, useRef } from 'react';
import { Upload, Download, Trash2, FileSpreadsheet, Plus, X, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { CrmTemplate } from '../../lib/supabase';
import { parseCSV } from '../../lib/csvParser';
import { ConfirmationModal } from '../../components/ConfirmationModal';

const CROSS_SELL_TEMPLATE_NAME = 'Cross-Sell Defaults Template';

const FIELD_KEYS = [
  'headline', 'subheadline', 'meta_title', 'meta_description', 'meta_image_url',
  'cta_text', 'button_cta_text',
  'bullet_1', 'bullet_1_description', 'bullet_2', 'bullet_2_description',
  'bullet_3', 'bullet_3_description', 'bullet_4', 'bullet_4_description',
  'bullet_5', 'bullet_5_description',
  'specialist_full_name', 'specialist_title', 'specialist_email', 'specialist_mobile',
  'funnel_link_step_1', 'funnel_link_step_2',
  'calendar_embed_code', 'appointment_disclaimer',
  'confirmation_headline', 'confirmation_subheadline', 'confirmation_next_steps',
  'system_crm_number',
  'qualification_age_requirement', 'qualification_doctor_participation',
  'qualification_enrollment_fee', 'qualification_income_guidelines',
] as const;

const SPECIALIST_FIELDS = ['specialist_full_name', 'specialist_title', 'specialist_email', 'specialist_mobile'];

const escapeCSVField = (value: string): string => {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

export const TemplateManagementTab: React.FC = () => {
  const [templates, setTemplates] = useState<CrmTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCrossSellUpload, setShowCrossSellUpload] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CrmTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadTemplates = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('crm_templates')
      .select('*')
      .order('created_at', { ascending: false });
    setTemplates(data || []);
    setLoading(false);
  };

  useEffect(() => { loadTemplates(); }, []);

  const handleDownload = (template: CrmTemplate) => {
    const csvHeader = template.headers.map(escapeCSVField).join(',');
    const csvRows = (template.sample_rows || []).map((row) =>
      template.headers.map((h) => escapeCSVField(row[h] || '')).join(',')
    );
    const csvContent = [csvHeader, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = template.file_name || `${template.name}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from('crm_templates').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    await loadTemplates();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-600" />
      </div>
    );
  }

  const crossSellTemplate = templates.find((t) => t.name === CROSS_SELL_TEMPLATE_NAME);
  const otherTemplates = templates.filter((t) => t.name !== CROSS_SELL_TEMPLATE_NAME);

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-sm text-gray-500">
            Upload CSV templates that agencies can download during onboarding
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-navy-600 rounded-lg hover:bg-navy-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Upload Template
        </button>
      </div>

      {crossSellTemplate && (
        <div className="mb-6">
          <CrossSellTemplateCard
            template={crossSellTemplate}
            onDownload={() => handleDownload(crossSellTemplate)}
            onUpload={() => setShowCrossSellUpload(true)}
          />
        </div>
      )}

      {otherTemplates.length === 0 && !crossSellTemplate ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No templates uploaded yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Upload a CSV file to create a downloadable template for agencies
          </p>
        </div>
      ) : otherTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {otherTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onDownload={() => handleDownload(template)}
              onDelete={() => setDeleteTarget(template)}
            />
          ))}
        </div>
      ) : null}

      {showUploadModal && (
        <UploadTemplateModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => { setShowUploadModal(false); loadTemplates(); }}
        />
      )}

      {showCrossSellUpload && crossSellTemplate && (
        <CrossSellUploadModal
          templateId={crossSellTemplate.id}
          onClose={() => setShowCrossSellUpload(false)}
          onSuccess={() => { setShowCrossSellUpload(false); loadTemplates(); }}
        />
      )}

      {deleteTarget && (
        <ConfirmationModal
          title="Delete Template"
          message={
            <p>
              Are you sure you want to delete the template{' '}
              <span className="font-semibold">"{deleteTarget.name}"</span>?
              This cannot be undone.
            </p>
          }
          confirmLabel="Delete"
          confirmColor="bg-red-600 hover:bg-red-700"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </>
  );
};

const CrossSellTemplateCard: React.FC<{
  template: CrmTemplate;
  onDownload: () => void;
  onUpload: () => void;
}> = ({ template, onDownload, onUpload }) => {
  const isUploaded = template.defaults_uploaded === true;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 text-sm">{template.name}</h4>
            {template.description && (
              <p className="text-xs text-gray-500 mt-0.5 max-w-md">{template.description}</p>
            )}
          </div>
        </div>
        {isUploaded && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Defaults Applied
          </span>
        )}
      </div>

      <div className="mb-4">
        <p className="text-xs font-medium text-gray-500 mb-1.5">Columns ({template.headers.length})</p>
        <div className="flex flex-wrap gap-1">
          {template.headers.map((h) => (
            <span key={h} className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
              {h}
            </span>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <p className="text-xs font-medium text-gray-500 mb-1">Format: 5 products x 28 fields = 140 rows</p>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          {new Date(template.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={onDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-navy-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
          {!isUploaded && (
            <button
              onClick={onUpload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Defaults
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const TemplateCard: React.FC<{
  template: CrmTemplate;
  onDownload: () => void;
  onDelete: () => void;
}> = ({ template, onDownload, onDelete }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors">
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
          <FileSpreadsheet className="w-5 h-5 text-navy-600" />
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 text-sm">{template.name}</h4>
          {template.description && (
            <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>
          )}
        </div>
      </div>
    </div>

    <div className="mb-4">
      <p className="text-xs font-medium text-gray-500 mb-1.5">Columns ({template.headers.length})</p>
      <div className="flex flex-wrap gap-1">
        {template.headers.slice(0, 6).map((h) => (
          <span key={h} className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
            {h}
          </span>
        ))}
        {template.headers.length > 6 && (
          <span className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-400 rounded text-xs">
            +{template.headers.length - 6} more
          </span>
        )}
      </div>
    </div>

    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
      <p className="text-xs text-gray-400">
        {new Date(template.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={onDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-navy-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </div>
);

const CrossSellUploadModal: React.FC<{
  templateId: string;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ templateId, onClose, onSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    setResult(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter((l) => l.trim());
      if (lines.length < 2) {
        setError('File appears empty or has no data rows.');
        setUploading(false);
        return;
      }

      const rows: { product_number: number; product_name: string; field_key: string; field_value: string }[] = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length < 3) continue;
        const productNumber = parseInt(parts[0].trim(), 10);
        const productName = parts[1].trim();
        const fieldKey = parts[2].trim();
        const fieldValue = parts.slice(3).join(',').trim();

        if (productNumber >= 1 && productNumber <= 5 && FIELD_KEYS.includes(fieldKey as typeof FIELD_KEYS[number])) {
          rows.push({ product_number: productNumber, product_name: productName || '', field_key: fieldKey, field_value: fieldValue });
        }
      }

      if (rows.length === 0) {
        setError('No valid rows found. Check the CSV format: Product Number, Product Name, Field Key, Field Value');
        setUploading(false);
        return;
      }

      // 1. Upsert into cross_sell_defaults
      let upserted = 0;
      for (const row of rows) {
        const { error: upsertError } = await supabase
          .from('cross_sell_defaults')
          .upsert(
            { product_number: row.product_number, product_name: row.product_name, field_key: row.field_key, field_value: row.field_value, updated_at: new Date().toISOString() },
            { onConflict: 'product_number,field_key' }
          );
        if (!upsertError) upserted++;
      }

      // 2. Propagate to all existing agencies
      const agencyUpdateCount = await propagateToAgencies(rows);

      // 3. Mark template as uploaded
      await supabase
        .from('crm_templates')
        .update({ defaults_uploaded: true })
        .eq('id', templateId);

      setResult(`Applied ${upserted} defaults across ${agencyUpdateCount} agencies.`);
      onSuccess();
    } catch {
      setError('Failed to parse file. Ensure it is a valid CSV.');
    }
    setUploading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Upload Cross-Sell Defaults</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600">
            Upload a CSV file with 140 rows (5 products x 28 fields) to set organization-wide default values.
            This is a one-time upload that will apply to all current and future agencies.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <p className="text-xs font-medium text-amber-800">
              This action cannot be undone. All current agencies will have their cross-sell products updated with these defaults (specialist info will be preserved).
            </p>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-navy-400 transition-colors">
            <FileSpreadsheet className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-3">Upload your filled CSV file</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleUpload}
              className="hidden"
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 text-sm font-medium text-white bg-navy-600 rounded-lg hover:bg-navy-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Applying Defaults...
                </>
              ) : (
                'Choose File'
              )}
            </button>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          {result && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">{result}</span>
            </div>
          )}
        </div>
        <div className="px-6 py-4 bg-gray-50 rounded-b-2xl flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

async function propagateToAgencies(
  rows: { product_number: number; product_name: string; field_key: string; field_value: string }[]
): Promise<number> {
  // Build a map: product_number -> { product_name, fields: { key: value } }
  const productMap = new Map<number, { product_name: string; fields: Record<string, string> }>();
  for (const row of rows) {
    if (!productMap.has(row.product_number)) {
      productMap.set(row.product_number, { product_name: row.product_name, fields: {} });
    }
    productMap.get(row.product_number)!.fields[row.field_key] = row.field_value;
  }

  // Get all existing agency cross-sell records
  const { data: agencyProducts } = await supabase
    .from('crm_agency_cross_sell')
    .select('id, agency_id, product_number, fields');

  if (!agencyProducts || agencyProducts.length === 0) return 0;

  const agencyIds = new Set<string>();
  for (const ap of agencyProducts) {
    const defaults = productMap.get(ap.product_number);
    if (!defaults) continue;

    // Merge: overwrite all fields except specialist fields that already have values
    const currentFields = (ap.fields || {}) as Record<string, string>;
    const newFields: Record<string, string> = { ...currentFields };

    for (const [key, value] of Object.entries(defaults.fields)) {
      if (SPECIALIST_FIELDS.includes(key) && currentFields[key]) {
        continue;
      }
      newFields[key] = value;
    }

    await supabase
      .from('crm_agency_cross_sell')
      .update({
        product_name: defaults.product_name,
        fields: newFields,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ap.id);

    agencyIds.add(ap.agency_id);
  }

  return agencyIds.size;
}

const UploadTemplateModal: React.FC<{
  onClose: () => void;
  onSuccess: () => void;
}> = ({ onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedSampleRows, setParsedSampleRows] = useState<Record<string, string>[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError('');

    const text = await f.text();
    const { headers, rows } = parseCSV(text);
    setParsedHeaders(headers);
    setParsedSampleRows(rows.slice(0, 3));

    if (!name) {
      setName(f.name.replace(/\.csv$/i, '').replace(/[_-]/g, ' '));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Template name is required.');
      return;
    }
    if (parsedHeaders.length === 0) {
      setError('Please upload a valid CSV file.');
      return;
    }

    setSubmitting(true);

    const { error: insertError } = await supabase
      .from('crm_templates')
      .insert({
        name: name.trim(),
        description: description.trim(),
        file_name: file?.name || `${name.trim()}.csv`,
        headers: parsedHeaders,
        sample_rows: parsedSampleRows,
      });

    if (insertError) {
      if (insertError.code === '23505') {
        setError('A template with this name already exists.');
      } else {
        setError('Failed to save template. Please try again.');
      }
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-navy-600">Upload Template</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CSV File</label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            {!file ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-navy-600/40 hover:bg-blue-50/30 transition-colors cursor-pointer"
              >
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-600">Click to select a CSV file</p>
                <p className="text-xs text-gray-400 mt-1">The headers will be used as template columns</p>
              </button>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <FileSpreadsheet className="w-5 h-5 text-navy-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{parsedHeaders.length} columns detected</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setFile(null); setParsedHeaders([]); setParsedSampleRows([]); if (fileRef.current) fileRef.current.value = ''; }}
                  className="p-1 hover:bg-blue-100 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            )}
          </div>

          {parsedHeaders.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">Detected Columns</p>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {parsedHeaders.map((h) => (
                  <span key={h} className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
              placeholder="e.g., Agent Roster Template"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
              placeholder="Brief description of this template"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || parsedHeaders.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-navy-600 rounded-lg hover:bg-navy-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
