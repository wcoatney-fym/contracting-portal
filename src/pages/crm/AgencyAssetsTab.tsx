import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  CheckCircle2,
  FolderOpen,
  Database,
  Upload,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { CrmTemplate } from '../../lib/supabase';
import { escapeField } from './onboardingHelpers';

interface AgencyAssetsTabProps {
  agencyName: string;
}

type RosterUpload = {
  id: string;
  file_name: string;
  row_count: number;
  headers: string[];
  uploaded_at: string;
};

type DbaUpload = {
  id: string;
  file_name: string;
  row_count: number;
  headers: string[];
  uploaded_at: string;
};

export const AgencyAssetsTab: React.FC<AgencyAssetsTabProps> = ({ agencyName }) => {
  const [rosterUploads, setRosterUploads] = useState<RosterUpload[]>([]);
  const [dbaUploads, setDbaUploads] = useState<DbaUpload[]>([]);
  const [templates, setTemplates] = useState<CrmTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [rosterRes, dbaRes, templateRes] = await Promise.all([
        supabase.from('crm_roster_uploads').select('*').eq('agency', agencyName).order('uploaded_at', { ascending: false }),
        supabase.from('crm_dba_uploads').select('*').eq('agency', agencyName).order('uploaded_at', { ascending: false }),
        supabase.from('crm_templates').select('*').order('name'),
      ]);

      setRosterUploads(rosterRes.data || []);
      setDbaUploads(dbaRes.data || []);
      setTemplates(templateRes.data || []);
      setLoading(false);
    };
    load();
  }, [agencyName]);

  const downloadTemplate = (template: CrmTemplate) => {
    const csvHeader = template.headers.map(escapeField).join(',');
    const blob = new Blob([csvHeader + '\n'], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = template.file_name || `${template.name}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadRosterData = async (uploadId: string, fileName: string, headers: string[]) => {
    const { data: rows } = await supabase
      .from('crm_roster')
      .select('row_data')
      .eq('upload_id', uploadId);

    if (!rows || rows.length === 0) return;

    const csvLines = [headers.map(escapeField).join(',')];
    for (const row of rows) {
      const line = headers.map((h) => escapeField(row.row_data[h] || '')).join(',');
      csvLines.push(line);
    }

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${agencyName}_roster_${fileName}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <Upload className="w-5 h-5 text-navy-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Agent Roster Uploads</h3>
            <p className="text-xs text-gray-500">{rosterUploads.length} upload{rosterUploads.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {rosterUploads.length === 0 ? (
          <div className="py-6 text-center">
            <FileSpreadsheet className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No roster uploads yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rosterUploads.map((upload) => (
              <div key={upload.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{upload.file_name}</p>
                    <p className="text-xs text-gray-500">
                      {upload.row_count} rows -- uploaded {new Date(upload.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => downloadRosterData(upload.id, upload.file_name, upload.headers)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-navy-600 bg-white border border-navy-600/20 rounded-lg hover:bg-navy-50 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center">
            <Database className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">DBA Client Roster Uploads</h3>
            <p className="text-xs text-gray-500">{dbaUploads.length} upload{dbaUploads.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {dbaUploads.length === 0 ? (
          <div className="py-6 text-center">
            <Database className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No DBA uploads yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dbaUploads.map((upload) => (
              <div key={upload.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{upload.file_name}</p>
                    <p className="text-xs text-gray-500">
                      {upload.row_count} rows -- uploaded {new Date(upload.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {templates.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Template Downloads</h3>
              <p className="text-xs text-gray-500">CSV templates for this agency</p>
            </div>
          </div>

          <div className="space-y-2">
            {templates.map((template) => (
              <div key={template.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{template.name}</p>
                  {template.description && <p className="text-xs text-gray-500">{template.description}</p>}
                </div>
                <button
                  onClick={() => downloadTemplate(template)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-navy-600 bg-white border border-navy-600/20 rounded-lg hover:bg-navy-50 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
