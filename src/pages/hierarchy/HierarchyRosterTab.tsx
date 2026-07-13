import React, { useState, useEffect, useRef } from 'react';
import { Upload, Search, UserPlus, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { CrmAgency } from '../../lib/supabase';
import { parseCSV } from '../../lib/csvParser';
import { normalizeRosterRows } from '../../lib/rosterNormalizer';

const MALE_PROFILE_IMAGE = 'https://storage.googleapis.com/msgsndr/YM9XmCanfO6p28b1sQOH/media/6882b3d23303840127a970fb.png';
const FEMALE_PROFILE_IMAGE = 'https://storage.googleapis.com/msgsndr/YM9XmCanfO6p28b1sQOH/media/6882b3d2f665866357dfd218.png';

interface HierarchyRosterTabProps {
  agency: CrmAgency;
}

type RosterRow = {
  id: string;
  row_data: Record<string, string>;
};

export const HierarchyRosterTab: React.FC<HierarchyRosterTabProps> = ({ agency }) => {
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadRoster(); }, [agency.name]);

  const loadRoster = async () => {
    setLoading(true);
    const { data: uploads } = await supabase
      .from('crm_roster_uploads')
      .select('id, headers')
      .eq('agency', agency.name)
      .order('uploaded_at', { ascending: false })
      .limit(1);

    if (uploads && uploads.length > 0) {
      setUploadId(uploads[0].id);
      const { data: rosterRows } = await supabase
        .from('crm_roster')
        .select('id, row_data')
        .eq('upload_id', uploads[0].id);

      const sorted = (rosterRows || []).sort((a, b) => {
        const aNum = parseInt(a.row_data['Seat Number'] || '', 10);
        const bNum = parseInt(b.row_data['Seat Number'] || '', 10);
        if (isNaN(aNum) && isNaN(bNum)) return 0;
        if (isNaN(aNum)) return 1;
        if (isNaN(bNum)) return -1;
        return aNum - bNum;
      });
      setRows(sorted);
    } else {
      setUploadId(null);
      setRows([]);
    }
    setLoading(false);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const text = await file.text();
      const { rows: rawRows } = parseCSV(text);
      if (rawRows.length === 0) {
        alert('CSV file appears to be empty or invalid.');
        setUploading(false);
        return;
      }

      const { data: agencyRecord } = await supabase
        .from('hierarchy_agencies')
        .select('crm_number, csr_npn, calendar_embed_code, agency_url_prefix')
        .eq('name', agency.name)
        .maybeSingle();

      const crmNumber = agencyRecord?.crm_number || '';
      const { headers: canonicalHeaders, rows: normalizedRows } = normalizeRosterRows(rawRows, crmNumber, agencyRecord?.csr_npn || undefined);

      if (uploadId) {
        await supabase.from('crm_roster_uploads').delete().eq('id', uploadId);
      }

      const { data: uploadRecord, error: uploadError } = await supabase
        .from('crm_roster_uploads')
        .insert({
          file_name: file.name,
          row_count: normalizedRows.length,
          headers: canonicalHeaders,
          agency: agency.name,
        })
        .select()
        .maybeSingle();

      if (uploadError || !uploadRecord) {
        throw uploadError || new Error('Failed to create upload record');
      }

      const BATCH_SIZE = 500;
      for (let i = 0; i < normalizedRows.length; i += BATCH_SIZE) {
        const batch = normalizedRows.slice(i, i + BATCH_SIZE).map(row => ({
          upload_id: uploadRecord.id,
          row_data: row,
        }));
        await supabase.from('crm_roster').insert(batch);
      }

      await padRosterTo200(uploadRecord.id, canonicalHeaders, agencyRecord);
      await loadRoster();
    } catch (err) {
      console.error(err);
      alert('Error uploading CSV. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const padRosterTo200 = async (uploadIdVal: string, headers: string[], agencyRecord: any) => {
    const { data: existingRows } = await supabase
      .from('crm_roster')
      .select('id, row_data')
      .eq('upload_id', uploadIdVal);

    const numericRows = (existingRows || []).filter(r => /^\d+$/.test(r.row_data['Seat Number'] || ''));
    const occupiedSeats = new Set(numericRows.map(r => Number(r.row_data['Seat Number'])));

    let crmNumber = '';
    const rowWithCrm = numericRows.find(r => r.row_data['All Templates | Agent CRM #']?.trim());
    if (rowWithCrm) crmNumber = rowWithCrm.row_data['All Templates | Agent CRM #'];

    const calendarEmbed = agencyRecord?.calendar_embed_code?.trim() || '';
    const urlPrefix = agencyRecord?.agency_url_prefix?.trim() || '';

    const rowsToInsert: { upload_id: string; row_data: Record<string, string> }[] = [];
    for (let seat = 1; seat <= 200; seat++) {
      if (!occupiedSeats.has(seat)) {
        const row: Record<string, string> = {};
        for (const h of headers) row[h] = '';
        row['Seat Number'] = String(seat);
        if (crmNumber) row['All Templates | Agent CRM #'] = crmNumber;
        if (calendarEmbed) row['Calendar Embed Code'] = calendarEmbed;
        if (urlPrefix) {
          row['Digital Business Card Home Page'] = `${urlPrefix}.my-agent-appt.com/r${seat}-click-to-schedule`;
          row['Appt Booked Confirmation Page'] = `${urlPrefix}.my-agent-appt.com/r${seat}-youre-confirmed`;
        }
        rowsToInsert.push({ upload_id: uploadIdVal, row_data: row });
      }
    }

    const BATCH_SIZE = 500;
    for (let i = 0; i < rowsToInsert.length; i += BATCH_SIZE) {
      await supabase.from('crm_roster').insert(rowsToInsert.slice(i, i + BATCH_SIZE));
    }
  };

  const handleAddAgent = async (form: { firstName: string; lastName: string; email: string; phone: string; npn: string; gender: string }) => {
    if (!uploadId) return 'No roster exists. Upload a CSV first.';

    const openSeat = rows.find(r => !r.row_data['First Name']?.trim() && r.row_data['Seat Number']?.trim());
    if (!openSeat) return 'No open seats available.';

    const profileImage = form.gender === 'Male' ? MALE_PROFILE_IMAGE : FEMALE_PROFILE_IMAGE;
    const crmNumber = rows.find(r => r.row_data['All Templates | Agent CRM #']?.trim())?.row_data['All Templates | Agent CRM #'] || '';

    const updatedRowData = {
      ...openSeat.row_data,
      'First Name': form.firstName.trim(),
      'Last Name': form.lastName.trim(),
      'Phone': form.phone.trim(),
      'phone': form.phone.trim(),
      'Email': form.email.trim(),
      'email': form.email.trim(),
      'Agent NPN': form.npn.trim(),
      'All Templates | Agent CRM #': crmNumber,
      'All Templates | Agent Profile Image': profileImage,
      'CSR Placeholder': '',
    };

    const { error } = await supabase
      .from('crm_roster')
      .update({ row_data: updatedRowData })
      .eq('id', openSeat.id);

    if (error) return 'Failed to assign seat.';
    await loadRoster();
    return null;
  };

  const populatedRows = rows.filter(r => r.row_data['First Name']?.trim());
  const filteredRows = search
    ? populatedRows.filter(r => {
        const name = `${r.row_data['First Name']} ${r.row_data['Last Name']}`.toLowerCase();
        return name.includes(search.toLowerCase());
      })
    : populatedRows;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-600" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-steel-900">Agent Roster</h3>
          <p className="text-sm text-steel-500">
            {populatedRows.length}/200 seats filled
          </p>
        </div>
        <div className="flex gap-2">
          {uploadId && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Add Agent
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-steel-300 text-steel-700 rounded-lg hover:bg-steel-50 transition-colors disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading...' : uploadId ? 'Replace CSV' : 'Upload CSV'}
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
      />

      {!uploadId ? (
        <div className="text-center py-12 border-2 border-dashed border-steel-200 rounded-xl">
          <Upload className="w-10 h-10 text-steel-300 mx-auto mb-3" />
          <p className="text-sm text-steel-500 mb-3">No roster uploaded for this agency</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-navy-600 text-white text-sm font-medium rounded-lg hover:bg-navy-700 disabled:opacity-50"
          >
            Upload CSV
          </button>
        </div>
      ) : (
        <>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agents..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-steel-200 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {filteredRows.map(row => (
              <div key={row.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-steel-50 border border-transparent hover:border-steel-200 transition-colors">
                <div className="w-8 h-8 rounded-full bg-steel-100 flex items-center justify-center text-xs font-bold text-steel-600">
                  {row.row_data['Seat Number']}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-steel-900 truncate">
                    {row.row_data['First Name']} {row.row_data['Last Name']}
                  </p>
                  <p className="text-xs text-steel-500 truncate">
                    {row.row_data['Email'] || row.row_data['email'] || '--'}
                  </p>
                </div>
                <span className="text-xs text-steel-400">{row.row_data['Agent NPN'] || ''}</span>
              </div>
            ))}
            {filteredRows.length === 0 && (
              <p className="text-center text-sm text-steel-500 py-8">
                {search ? 'No agents match your search.' : 'No agents on roster yet.'}
              </p>
            )}
          </div>
        </>
      )}

      {showAddModal && (
        <AddAgentToRosterModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddAgent}
        />
      )}
    </div>
  );
};

const AddAgentToRosterModal: React.FC<{
  onClose: () => void;
  onAdd: (form: { firstName: string; lastName: string; email: string; phone: string; npn: string; gender: string }) => Promise<string | null>;
}> = ({ onClose, onAdd }) => {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', npn: '', gender: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.phone.trim() || !form.gender) {
      setError('First name, last name, phone, and gender are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    const err = await onAdd(form);
    if (err) setError(err);
    else onClose();
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-steel-200">
          <h3 className="font-semibold text-steel-900">Add Agent to Roster</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-steel-100 rounded-lg">
            <X className="w-5 h-5 text-steel-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-steel-700 mb-1">First Name *</label>
              <input
                type="text" value={form.firstName}
                onChange={(e) => { setForm(f => ({ ...f, firstName: e.target.value })); setError(''); }}
                className="w-full px-3 py-2 text-sm border border-steel-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-steel-700 mb-1">Last Name *</label>
              <input
                type="text" value={form.lastName}
                onChange={(e) => { setForm(f => ({ ...f, lastName: e.target.value })); setError(''); }}
                className="w-full px-3 py-2 text-sm border border-steel-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-steel-700 mb-1">Email</label>
            <input
              type="email" value={form.email}
              onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-steel-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-steel-700 mb-1">Phone *</label>
              <input
                type="tel" value={form.phone}
                onChange={(e) => { setForm(f => ({ ...f, phone: e.target.value })); setError(''); }}
                className="w-full px-3 py-2 text-sm border border-steel-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-steel-700 mb-1">NPN</label>
              <input
                type="text" value={form.npn}
                onChange={(e) => setForm(f => ({ ...f, npn: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-steel-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-steel-700 mb-2">Gender *</label>
            <div className="flex gap-3">
              <button type="button" onClick={() => setForm(f => ({ ...f, gender: 'Male' }))}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  form.gender === 'Male' ? 'bg-navy-50 border-navy-300 text-navy-700 ring-2 ring-navy-500/20' : 'border-steel-300 text-steel-700 hover:bg-steel-50'
                }`}>Male</button>
              <button type="button" onClick={() => setForm(f => ({ ...f, gender: 'Female' }))}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  form.gender === 'Female' ? 'bg-navy-50 border-navy-300 text-navy-700 ring-2 ring-navy-500/20' : 'border-steel-300 text-steel-700 hover:bg-steel-50'
                }`}>Female</button>
            </div>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-steel-700 border border-steel-300 rounded-lg hover:bg-steel-50">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium bg-navy-600 text-white rounded-lg hover:bg-navy-700 disabled:opacity-50">
              {submitting ? 'Adding...' : 'Add Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
