import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Search,
  Undo2,
  Download,
  UserX,
  Zap,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { parseCSV } from '../../lib/csvParser';
import { fireCrmOnboardingWebhook, warmUpCrmOnboardingWebhook } from '../../lib/webhooks';
import { AgencyRosterCard } from '../../components/AgencyRosterCard';
import { normalizeRosterRows } from '../../lib/rosterNormalizer';

const MALE_PROFILE_IMAGE = 'https://storage.googleapis.com/msgsndr/YM9XmCanfO6p28b1sQOH/media/6882b3d23303840127a970fb.png';
const FEMALE_PROFILE_IMAGE = 'https://storage.googleapis.com/msgsndr/YM9XmCanfO6p28b1sQOH/media/6882b3d2f665866357dfd218.png';

type RosterUpload = {
  id: string;
  file_name: string;
  row_count: number;
  headers: string[];
  uploaded_at: string;
  agency: string;
};

type RosterRow = {
  id: string;
  upload_id: string;
  row_data: Record<string, string>;
  created_at: string;
};

const PAGE_SIZE = 50;

export const RosterTab: React.FC = () => {
  const [agencyNames, setAgencyNames] = useState<string[]>([]);
  const [agencyFilter, setAgencyFilter] = useState('All');
  const [uploadsByAgency, setUploadsByAgency] = useState<Record<string, RosterUpload | null>>({});
  const [activeUpload, setActiveUpload] = useState<RosterUpload | null>(null);
  const [allRows, setAllRows] = useState<RosterRow[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploadingAgency, setUploadingAgency] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<RosterUpload | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [undoConfirmRow, setUndoConfirmRow] = useState<RosterRow | null>(null);
  const [undoSubmitting, setUndoSubmitting] = useState(false);
  const [undoError, setUndoError] = useState('');
  const [terminateRow, setTerminateRow] = useState<RosterRow | null>(null);
  const [terminateSubmitting, setTerminateSubmitting] = useState(false);
  const [terminateError, setTerminateError] = useState('');
  const [populatedCounts, setPopulatedCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadUploads();
  }, []);

  useEffect(() => {
    if (activeUpload) {
      loadRows();
    }
  }, [activeUpload]);

  const loadUploads = async () => {
    setLoading(true);
    const [uploadsRes, agencyRes] = await Promise.all([
      supabase.from('crm_roster_uploads').select('*').order('uploaded_at', { ascending: false }),
      supabase.from('crm_agencies').select('name').eq('is_active', true).order('name'),
    ]);

    const names = (agencyRes.data || []).map((a: { name: string }) => a.name);
    setAgencyNames(names);

    const byAgency: Record<string, RosterUpload | null> = {};
    for (const name of names) {
      byAgency[name] = null;
    }

    if (uploadsRes.data) {
      for (const upload of uploadsRes.data) {
        if (upload.agency && byAgency.hasOwnProperty(upload.agency)) {
          byAgency[upload.agency] = upload;
        }
      }
    }

    setUploadsByAgency(byAgency);
    setLoading(false);

    const uploadIds = Object.values(byAgency)
      .filter((u): u is RosterUpload => u !== null)
      .map((u) => u.id);

    if (uploadIds.length > 0) {
      const { data: rosterRows } = await supabase
        .from('crm_roster')
        .select('upload_id, row_data')
        .in('upload_id', uploadIds);

      if (rosterRows) {
        const counts: Record<string, number> = {};
        for (const name of names) {
          const upload = byAgency[name];
          if (!upload) continue;
          counts[name] = rosterRows.filter(
            (r) =>
              r.upload_id === upload.id &&
              r.row_data['First Name']?.trim()
          ).length;
        }
        setPopulatedCounts(counts);
      }
    }
  };

  const loadRows = async () => {
    if (!activeUpload) return;

    const { data } = await supabase
      .from('crm_roster')
      .select('*')
      .eq('upload_id', activeUpload.id);

    const sorted = (data || []).sort((a, b) => {
      const aNum = parseInt(a.row_data['Seat Number'] || '', 10);
      const bNum = parseInt(b.row_data['Seat Number'] || '', 10);
      if (isNaN(aNum) && isNaN(bNum)) return 0;
      if (isNaN(aNum)) return 1;
      if (isNaN(bNum)) return -1;
      return aNum - bNum;
    });
    setAllRows(sorted);
  };

  const padRosterTo200 = async (uploadId: string, headers: string[], agencyFields?: { calendarEmbedCode?: string | null; agencyUrlPrefix?: string | null }) => {
    const { data: existingRows } = await supabase
      .from('crm_roster')
      .select('id, row_data')
      .eq('upload_id', uploadId);

    const numericRows = (existingRows || []).filter(
      (r) => /^\d+$/.test(r.row_data['Seat Number'] || '')
    );

    const occupiedSeats = new Set(numericRows.map((r) => Number(r.row_data['Seat Number'])));

    let crmNumber = '';
    const rowWithCrm = numericRows.find((r) => r.row_data['All Templates | Agent CRM #']?.trim());
    if (rowWithCrm) {
      crmNumber = rowWithCrm.row_data['All Templates | Agent CRM #'];
    }

    const calendarEmbed = agencyFields?.calendarEmbedCode?.trim() || '';
    const urlPrefix = agencyFields?.agencyUrlPrefix?.trim() || '';

    const emptyRow = (seat: number): Record<string, string> => {
      const row: Record<string, string> = {};
      for (const h of headers) {
        row[h] = '';
      }
      row['Seat Number'] = String(seat);
      if (crmNumber) row['All Templates | Agent CRM #'] = crmNumber;
      if (calendarEmbed) row['Calendar Embed Code'] = calendarEmbed;
      if (urlPrefix) {
        row['Digital Business Card Home Page'] = `${urlPrefix}.my-agent-appt.com/r${seat}-click-to-schedule`;
        row['Appt Booked Confirmation Page'] = `${urlPrefix}.my-agent-appt.com/r${seat}-youre-confirmed`;
      }
      return row;
    };

    const rowsToInsert: { upload_id: string; row_data: Record<string, string> }[] = [];
    for (let seat = 1; seat <= 200; seat++) {
      if (!occupiedSeats.has(seat)) {
        rowsToInsert.push({ upload_id: uploadId, row_data: emptyRow(seat) });
      }
    }

    if (crmNumber || calendarEmbed || urlPrefix) {
      const rowsNeedingUpdate = numericRows.filter(
        (r) => (crmNumber && !r.row_data['All Templates | Agent CRM #']?.trim()) ||
               (calendarEmbed && !r.row_data['Calendar Embed Code']?.trim()) ||
               (urlPrefix && !r.row_data['Digital Business Card Home Page']?.trim())
      );
      for (const row of rowsNeedingUpdate) {
        const seat = Number(row.row_data['Seat Number']);
        const updatedData: Record<string, string> = { ...row.row_data };
        if (crmNumber) updatedData['All Templates | Agent CRM #'] = crmNumber;
        if (calendarEmbed) updatedData['Calendar Embed Code'] = calendarEmbed;
        if (urlPrefix && seat) {
          updatedData['Digital Business Card Home Page'] = `${urlPrefix}.my-agent-appt.com/r${seat}-click-to-schedule`;
          updatedData['Appt Booked Confirmation Page'] = `${urlPrefix}.my-agent-appt.com/r${seat}-youre-confirmed`;
        }
        await supabase
          .from('crm_roster')
          .update({ row_data: updatedData })
          .eq('id', row.id);
      }
    }

    const BATCH_SIZE = 500;
    for (let i = 0; i < rowsToInsert.length; i += BATCH_SIZE) {
      const batch = rowsToInsert.slice(i, i + BATCH_SIZE);
      await supabase.from('crm_roster').insert(batch);
    }
  };

  const handleUpload = async (agency: string, file: File) => {
    setUploadingAgency(agency);

    try {
      const text = await file.text();
      const { rows: rawRows } = parseCSV(text);

      if (rawRows.length === 0) {
        alert('CSV file appears to be empty or invalid.');
        setUploadingAgency(null);
        return;
      }

      const { data: agencyRecord } = await supabase
        .from('crm_agencies')
        .select('crm_number, csr_npn, calendar_embed_code, agency_url_prefix')
        .eq('name', agency)
        .maybeSingle();
      const crmNumber = agencyRecord?.crm_number || '';

      const { headers: canonicalHeaders, rows: normalizedRows } = normalizeRosterRows(rawRows, crmNumber, agencyRecord?.csr_npn || undefined);

      const existing = uploadsByAgency[agency];
      if (existing) {
        await supabase.from('crm_roster_uploads').delete().eq('id', existing.id);
      }

      const { data: uploadRecord, error: uploadError } = await supabase
        .from('crm_roster_uploads')
        .insert({
          file_name: file.name,
          row_count: normalizedRows.length,
          headers: canonicalHeaders,
          agency,
        })
        .select()
        .maybeSingle();

      if (uploadError || !uploadRecord) {
        throw uploadError || new Error('Failed to create upload record');
      }

      const BATCH_SIZE = 500;
      for (let i = 0; i < normalizedRows.length; i += BATCH_SIZE) {
        const batch = normalizedRows.slice(i, i + BATCH_SIZE).map((row) => ({
          upload_id: uploadRecord.id,
          row_data: row,
        }));

        const { error: insertError } = await supabase.from('crm_roster').insert(batch);
        if (insertError) throw insertError;
      }

      await padRosterTo200(uploadRecord.id, canonicalHeaders, {
        calendarEmbedCode: agencyRecord?.calendar_embed_code,
        agencyUrlPrefix: agencyRecord?.agency_url_prefix,
      });
      await loadUploads();
    } catch (err) {
      console.error(err);
      alert('Error uploading CSV. Please check the file and try again.');
    } finally {
      setUploadingAgency(null);
    }
  };

  const handleView = (upload: RosterUpload) => {
    setActiveUpload(upload);
    setPage(0);
    setSearchTerm('');
    setAllRows([]);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);

    const { error } = await supabase
      .from('crm_roster_uploads')
      .delete()
      .eq('id', deleteConfirm.id);

    if (!error) {
      if (activeUpload?.id === deleteConfirm.id) {
        setActiveUpload(null);
        setAllRows([]);
      }
      await loadUploads();
    }

    setDeleting(false);
    setDeleteConfirm(null);
  };

  const handleBack = () => {
    setActiveUpload(null);
    setAllRows([]);
    setSearchTerm('');
    setPage(0);
  };

  const handleRosterUndo = async () => {
    if (!undoConfirmRow || !activeUpload) return;
    setUndoSubmitting(true);
    setUndoError('');

    try {
      const clearedRowData = {
        ...undoConfirmRow.row_data,
        'First Name': '',
        'Last Name': '',
        'Phone': '',
        'phone': '',
        'Email': '',
        'email': '',
        'Agent NPN': '',
        'All Templates | Agent Profile Image': '',
      };

      const { error: updateError } = await supabase
        .from('crm_roster')
        .update({ row_data: clearedRowData })
        .eq('id', undoConfirmRow.id);

      if (updateError) {
        setUndoError('Failed to clear roster seat. Please try again.');
        setUndoSubmitting(false);
        return;
      }

      const agency = activeUpload.agency;
      const { data: matchingAgents } = await supabase
        .from('agents')
        .select('id, first_name, last_name')
        .eq('status', 'completed')
        .eq('agency', agency);

      const testerAgents = (matchingAgents || []).filter(
        (a) => a.first_name.toLowerCase() === 'tester' && a.last_name.toLowerCase() === 'mitchell'
      );

      for (const agent of testerAgents) {
        await supabase
          .from('agents')
          .update({ crm_onboarded: false })
          .eq('id', agent.id);
      }

      await loadRows();
      setUndoSubmitting(false);
      setUndoConfirmRow(null);
    } catch {
      setUndoError('An unexpected error occurred. Please try again.');
      setUndoSubmitting(false);
    }
  };

  const handleRosterTerminate = async () => {
    if (!terminateRow || !activeUpload) return;
    setTerminateSubmitting(true);
    setTerminateError('');

    try {
      const firstName = terminateRow.row_data['First Name'] || '';
      const lastName = terminateRow.row_data['Last Name'] || '';
      const email = terminateRow.row_data['Email'] || '';
      const agency = activeUpload.agency;

      const { data: agencyData } = await supabase
        .from('crm_agencies')
        .select('csr_can_fill_seat, csr_first_name, csr_last_name, csr_phone, csr_email, csr_npn, csr_gender, zaps_paused')
        .eq('name', agency)
        .maybeSingle();

      const csrCanFill = agencyData?.csr_can_fill_seat && agencyData?.csr_npn?.trim();

      if (csrCanFill) {
        const csrProfileImage = agencyData.csr_gender === 'Male' ? MALE_PROFILE_IMAGE : agencyData.csr_gender === 'Female' ? FEMALE_PROFILE_IMAGE : '';
        const csrRowData = {
          ...terminateRow.row_data,
          'First Name': agencyData.csr_first_name || '',
          'Last Name': agencyData.csr_last_name || '',
          'Phone': agencyData.csr_phone || '',
          'phone': agencyData.csr_phone || '',
          'Email': agencyData.csr_email || '',
          'email': agencyData.csr_email || '',
          'Agent NPN': agencyData.csr_npn || '',
          'All Templates | Agent Profile Image': csrProfileImage,
          'CSR Placeholder': 'true',
        };

        const { error: updateError } = await supabase
          .from('crm_roster')
          .update({ row_data: csrRowData })
          .eq('id', terminateRow.id);

        if (updateError) {
          setTerminateError('Failed to update roster seat with CSR. Please try again.');
          setTerminateSubmitting(false);
          return;
        }

        if (!agencyData.zaps_paused) {
          const crmNumber = terminateRow.row_data['All Templates | Agent CRM #'] || '';
          await fireCrmOnboardingWebhook({
            seatNumber: terminateRow.row_data['Seat Number'] || '',
            agentNpn: agencyData.csr_npn || '',
            firstName: agencyData.csr_first_name || '',
            lastName: agencyData.csr_last_name || '',
            email: agencyData.csr_email || '',
            phone: agencyData.csr_phone || '',
            profileImage: csrProfileImage,
            crmNumber,
            agency,
          });
        }
      } else {
        const clearedRowData = {
          ...terminateRow.row_data,
          'First Name': '',
          'Last Name': '',
          'Phone': '',
          'phone': '',
          'Email': '',
          'email': '',
          'Agent NPN': '',
          'All Templates | Agent Profile Image': '',
          'CSR Placeholder': '',
        };

        const { error: updateError } = await supabase
          .from('crm_roster')
          .update({ row_data: clearedRowData })
          .eq('id', terminateRow.id);

        if (updateError) {
          setTerminateError('Failed to clear roster seat. Please try again.');
          setTerminateSubmitting(false);
          return;
        }
      }

      const now = new Date().toISOString();

      const { data: matchingAgents } = await supabase
        .from('agents')
        .select('id')
        .eq('status', 'completed')
        .eq('agency', agency)
        .ilike('first_name', firstName)
        .ilike('last_name', lastName)
        .ilike('email', email);

      if (matchingAgents && matchingAgents.length > 0) {
        for (const agent of matchingAgents) {
          await supabase
            .from('agents')
            .update({ status: 'terminated', crm_onboarded: false, terminated_at: now, updated_at: now })
            .eq('id', agent.id);

          await supabase
            .from('crm_pipeline')
            .update({ terminated_at: now, updated_at: now })
            .eq('agent_id', agent.id);
        }
      }

      const agentNpn = terminateRow.row_data['Agent NPN'] || '';
      await supabase.from('crm_termination_log').insert({
        agent_name: `${firstName} ${lastName}`.trim(),
        agent_npn: agentNpn,
        status: 'terminated',
        agency,
        terminated_at: now,
      });

      await loadRows();
      setTerminateSubmitting(false);
      setTerminateRow(null);
    } catch {
      setTerminateError('An unexpected error occurred. Please try again.');
      setTerminateSubmitting(false);
    }
  };

  const filteredRows = searchTerm
    ? allRows.filter((row) =>
        Object.values(row.row_data).some((val) =>
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : allRows;

  const totalRows = filteredRows.length;
  const totalPages = Math.ceil(totalRows / PAGE_SIZE);
  const paginatedRows = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const visibleAgencies = agencyFilter === 'All'
    ? agencyNames
    : agencyNames.filter((a) => a === agencyFilter);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 bg-white border border-steel-200 rounded-xl p-1.5">
          {[...Array(4)].map((_, i) => <div key={i} className="h-8 w-24 bg-steel-100 rounded-lg animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-36 bg-white rounded-2xl border border-steel-200 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <>
      {!activeUpload && (
        <div className="flex items-center gap-2 mb-5">
          {['All', ...agencyNames].map((a) => (
            <button
              key={a}
              onClick={() => setAgencyFilter(a)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                agencyFilter === a
                  ? 'bg-navy-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      )}

      {!activeUpload ? (
        <div className={`grid gap-6 ${visibleAgencies.length === 1 ? 'grid-cols-1 max-w-md' : 'grid-cols-1 md:grid-cols-3'}`}>
          {visibleAgencies.map((agency) => (
            <AgencyRosterCard
              key={agency}
              agency={agency}
              upload={uploadsByAgency[agency]}
              uploading={uploadingAgency === agency}
              populatedCount={populatedCounts[agency]}
              onUpload={handleUpload}
              onView={handleView}
              onDelete={setDeleteConfirm}
            />
          ))}
        </div>
      ) : (
        <RosterTableView
          upload={activeUpload}
          rows={paginatedRows}
          allRows={allRows}
          totalRows={totalRows}
          totalPages={totalPages}
          page={page}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onPageChange={setPage}
          onBack={handleBack}
          onUndo={(row) => { setUndoError(''); setUndoConfirmRow(row); }}
          onTerminate={(row) => { setTerminateError(''); setTerminateRow(row); }}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full animate-in fade-in">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-red-600">Delete Upload</h2>
            </div>
            <div className="px-6 py-5">
              <p className="text-gray-700">
                This will permanently delete{' '}
                <span className="font-semibold">{deleteConfirm.file_name}</span> and all{' '}
                <span className="font-semibold">{deleteConfirm.row_count.toLocaleString()}</span>{' '}
                associated records for{' '}
                <span className="font-semibold">{deleteConfirm.agency}</span>.
              </p>
              <p className="text-gray-500 text-sm mt-2">This action cannot be undone.</p>
            </div>
            <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      {undoConfirmRow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full animate-in fade-in">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-orange-600">Undo CRM Seat</h2>
            </div>
            <div className="px-6 py-5">
              <p className="text-gray-700">
                This will clear the agent data from seat <span className="font-semibold">#{undoConfirmRow.row_data['Seat Number']}</span> for{' '}
                <span className="font-semibold">{undoConfirmRow.row_data['First Name']} {undoConfirmRow.row_data['Last Name']}</span> and
                allow re-onboarding.
              </p>
              <p className="text-gray-500 text-sm mt-2">This is a test-only action.</p>
              {undoError && (
                <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{undoError}</p>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end gap-3">
              <button
                onClick={() => { setUndoConfirmRow(null); setUndoError(''); }}
                disabled={undoSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRosterUndo}
                disabled={undoSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                {undoSubmitting ? 'Clearing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {terminateRow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full animate-in fade-in">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-red-600">Terminate Agent</h2>
            </div>
            <div className="px-6 py-5">
              <p className="text-gray-700">
                This will terminate <span className="font-semibold">{terminateRow.row_data['First Name']} {terminateRow.row_data['Last Name']}</span>,
                clear seat <span className="font-semibold">#{terminateRow.row_data['Seat Number']}</span> from the{' '}
                <span className="font-semibold">{activeUpload?.agency}</span> CRM roster,
                and mark them as terminated.
              </p>
              <p className="text-gray-500 text-sm mt-2">This action cannot be undone.</p>
              {terminateError && (
                <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{terminateError}</p>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end gap-3">
              <button
                onClick={() => { setTerminateRow(null); setTerminateError(''); }}
                disabled={terminateSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRosterTerminate}
                disabled={terminateSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {terminateSubmitting ? 'Terminating...' : 'Terminate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

interface RosterTableViewProps {
  upload: RosterUpload;
  rows: RosterRow[];
  allRows: RosterRow[];
  totalRows: number;
  totalPages: number;
  page: number;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onPageChange: (page: number) => void;
  onBack: () => void;
  onUndo: (row: RosterRow) => void;
  onTerminate: (row: RosterRow) => void;
}

const escapeCSVField = (value: string): string => {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const RosterTableView: React.FC<RosterTableViewProps> = ({
  upload,
  rows,
  allRows,
  totalRows,
  totalPages,
  page,
  searchTerm,
  onSearchChange,
  onPageChange,
  onBack,
  onUndo,
  onTerminate,
}) => {
  const [zapConfirmOpen, setZapConfirmOpen] = useState(false);
  const [zapSending, setZapSending] = useState(false);
  const [zapProgress, setZapProgress] = useState({ sent: 0, total: 0, failed: 0 });
  const [zapResult, setZapResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [rowZapSending, setRowZapSending] = useState<string | null>(null);
  const [rowZapResults, setRowZapResults] = useState<Record<string, 'success' | 'failed' | 'paused'>>({});

  const AGENCY_COLORS: Record<string, string> = {
    FYM: 'text-navy-600',
    Wisechoice: 'text-emerald-700',
    Aspire: 'text-amber-700',
  };

  const populatedRows = allRows.filter((row) => row.row_data['First Name']?.trim());

  const handleFireToZap = async () => {
    setZapConfirmOpen(false);
    setZapSending(true);
    setZapResult(null);

    const { data: agencyData } = await supabase
      .from('crm_agencies')
      .select('zaps_paused')
      .eq('name', upload.agency)
      .maybeSingle();

    if (agencyData?.zaps_paused) {
      setZapSending(false);
      setZapResult({ sent: 0, failed: 0, total: populatedRows.length });
      return;
    }

    const total = populatedRows.length;
    setZapProgress({ sent: 0, total, failed: 0 });

    // Warm up the edge function to eliminate cold start issues
    await warmUpCrmOnboardingWebhook();
    await new Promise((r) => setTimeout(r, 1500));

    let sent = 0;
    let failed = 0;
    const failedRows: typeof populatedRows = [];

    for (const row of populatedRows) {
      const success = await fireCrmOnboardingWebhook({
        seatNumber: row.row_data['Seat Number'] || '',
        agentNpn: row.row_data['Agent NPN'] || '',
        firstName: row.row_data['First Name'] || '',
        lastName: row.row_data['Last Name'] || '',
        email: row.row_data['Email'] || '',
        phone: row.row_data['Phone'] || '',
        profileImage: row.row_data['All Templates | Agent Profile Image'] || '',
        crmNumber: row.row_data['All Templates | Agent CRM #'] || '',
        agency: upload.agency,
        digitalBusinessCardUrl: row.row_data['Digital Business Card Home Page'] || '',
        confirmationPageUrl: row.row_data['Appt Booked Confirmation Page'] || '',
        calendarEmbedCode: row.row_data['Calendar Embed Code'] || '',
      });

      if (success) {
        sent++;
      } else {
        failed++;
        failedRows.push(row);
      }
      setZapProgress({ sent, total, failed });

      await new Promise((r) => setTimeout(r, 3000));
    }

    // Retry failed rows once with a longer delay
    if (failedRows.length > 0) {
      await new Promise((r) => setTimeout(r, 5000));
      for (const row of failedRows) {
        const success = await fireCrmOnboardingWebhook({
          seatNumber: row.row_data['Seat Number'] || '',
          agentNpn: row.row_data['Agent NPN'] || '',
          firstName: row.row_data['First Name'] || '',
          lastName: row.row_data['Last Name'] || '',
          email: row.row_data['Email'] || '',
          phone: row.row_data['Phone'] || '',
          profileImage: row.row_data['All Templates | Agent Profile Image'] || '',
          crmNumber: row.row_data['All Templates | Agent CRM #'] || '',
          agency: upload.agency,
          digitalBusinessCardUrl: row.row_data['Digital Business Card Home Page'] || '',
          confirmationPageUrl: row.row_data['Appt Booked Confirmation Page'] || '',
          calendarEmbedCode: row.row_data['Calendar Embed Code'] || '',
        });

        if (success) {
          sent++;
          failed--;
          setZapProgress({ sent, total, failed });
        }

        await new Promise((r) => setTimeout(r, 5000));
      }
    }

    setZapSending(false);
    setZapResult({ sent, failed, total });
  };

  const handleFireRowToZap = async (row: RosterRow) => {
    setRowZapSending(row.id);

    const { data: agencyData } = await supabase
      .from('crm_agencies')
      .select('zaps_paused')
      .eq('name', upload.agency)
      .maybeSingle();

    if (agencyData?.zaps_paused) {
      setRowZapResults((prev) => ({ ...prev, [row.id]: 'paused' }));
      setRowZapSending(null);
      return;
    }

    const success = await fireCrmOnboardingWebhook({
      seatNumber: row.row_data['Seat Number'] || '',
      agentNpn: row.row_data['Agent NPN'] || '',
      firstName: row.row_data['First Name'] || '',
      lastName: row.row_data['Last Name'] || '',
      email: row.row_data['Email'] || '',
      phone: row.row_data['Phone'] || '',
      profileImage: row.row_data['All Templates | Agent Profile Image'] || '',
      crmNumber: row.row_data['All Templates | Agent CRM #'] || '',
      agency: upload.agency,
      digitalBusinessCardUrl: row.row_data['Digital Business Card Home Page'] || '',
      confirmationPageUrl: row.row_data['Appt Booked Confirmation Page'] || '',
      calendarEmbedCode: row.row_data['Calendar Embed Code'] || '',
    });

    setRowZapResults((prev) => ({ ...prev, [row.id]: success ? 'success' : 'failed' }));
    setRowZapSending(null);
  };

  const handleExport = () => {
    const headers = upload.headers;
    const csvHeader = headers.map(escapeCSVField).join(',');
    const csvRows = allRows.map((row) =>
      headers.map((h) => escapeCSVField(row.row_data[h] || '')).join(',')
    );
    const csvContent = [csvHeader, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${upload.agency}_roster_export.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-6 h-6 text-gray-400" />
            <div>
              <h2 className={`text-xl font-bold ${AGENCY_COLORS[upload.agency] || 'text-gray-900'}`}>
                {upload.agency} CRM Roster
              </h2>

              <p className="text-sm text-gray-500">
                {upload.file_name} -- {totalRows.toLocaleString()} records
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setZapResult(null); setZapConfirmOpen(true); }}
            disabled={zapSending || populatedRows.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap className="w-4 h-4" />
            {zapSending
              ? `Sending ${zapProgress.sent}/${zapProgress.total}...`
              : `Send to Zap (${populatedRows.length})`}
          </button>
          <button
            onClick={handleExport}
            disabled={allRows.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-navy-600 rounded-lg hover:bg-navy-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {zapSending && zapProgress.total > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-1.5">
            <span>Sending {zapProgress.sent + zapProgress.failed} of {zapProgress.total}...</span>
            <span className="tabular-nums font-medium">
              {Math.round(((zapProgress.sent + zapProgress.failed) / zapProgress.total) * 100)}%
            </span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${((zapProgress.sent + zapProgress.failed) / zapProgress.total) * 100}%`,
                background: zapProgress.failed > 0
                  ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                  : 'linear-gradient(90deg, #f59e0b, #22c55e)',
              }}
            />
          </div>
          <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500">
            <span className="text-green-600 font-medium">{zapProgress.sent} sent</span>
            {zapProgress.failed > 0 && (
              <span className="text-red-600 font-medium">{zapProgress.failed} failed</span>
            )}
          </div>
        </div>
      )}

      {zapResult && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
          zapResult.failed === 0 && zapResult.sent > 0
            ? 'bg-green-50 text-green-700 border border-green-200'
            : zapResult.sent === 0
            ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-amber-50 text-amber-700 border border-amber-200'
        }`}>
          {zapResult.sent === 0 && zapResult.failed === 0
            ? 'Zaps are paused for this agency. No rows were sent.'
            : `Sent ${zapResult.sent} of ${zapResult.total} agents to Zap.${zapResult.failed > 0 ? ` ${zapResult.failed} failed.` : ''}`}
          <button onClick={() => setZapResult(null)} className="ml-3 underline opacity-70 hover:opacity-100">Dismiss</button>
        </div>
      )}

      {zapConfirmOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full animate-in fade-in">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-amber-600">Send Roster to Zap</h2>
            </div>
            <div className="px-6 py-5">
              <p className="text-gray-700">
                This will send <span className="font-semibold">{populatedRows.length}</span> populated agent rows
                to the onboarding Zap for <span className="font-semibold">{upload.agency}</span>, one at a time.
              </p>
              <p className="text-gray-500 text-sm mt-2">Each row includes: Seat Number, First Name, Last Name, Email, Phone, Agent NPN, Profile Image, and CRM Number.</p>
            </div>
            <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end gap-3">
              <button
                onClick={() => setZapConfirmOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleFireToZap}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors"
              >
                Send All
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search across all columns..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
            />
          </div>
          <p className="text-sm text-gray-500 whitespace-nowrap">
            {totalRows.toLocaleString()} total records
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                  #
                </th>
                {upload.headers.map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap"
                  >
                    {header}
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={upload.headers.length + 2}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    {searchTerm ? 'No matching records found.' : 'No data available.'}
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row.id} className={`transition-colors ${row.row_data['CSR Placeholder'] === 'true' ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">
                      {page * PAGE_SIZE + idx + 1}
                    </td>
                    {upload.headers.map((header) => (
                      <td
                        key={header}
                        className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap max-w-[250px] truncate"
                        title={row.row_data[header] || ''}
                      >
                        {header === 'First Name' && row.row_data['CSR Placeholder'] === 'true' ? (
                          <span className="flex items-center gap-1.5">
                            {row.row_data[header] || ''}
                            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-amber-200 text-amber-800 rounded">
                              CSR
                            </span>
                          </span>
                        ) : (
                          row.row_data[header] || ''
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {row.row_data['First Name']?.trim() && (
                          <div className="relative group/zap">
                            <button
                              onClick={() => handleFireRowToZap(row)}
                              disabled={rowZapSending === row.id || zapSending}
                              className={`p-1.5 rounded transition-colors ${
                                rowZapResults[row.id] === 'success'
                                  ? 'text-green-500 bg-green-50'
                                  : rowZapResults[row.id] === 'failed'
                                  ? 'text-red-500 bg-red-50'
                                  : rowZapResults[row.id] === 'paused'
                                  ? 'text-gray-400 bg-gray-50'
                                  : 'text-amber-500 hover:bg-amber-50'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                              aria-label="Send row to Zap"
                            >
                              <Zap className={`w-4 h-4 ${rowZapSending === row.id ? 'animate-pulse' : ''}`} />
                            </button>
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-xs font-medium text-white bg-gray-800 rounded whitespace-nowrap opacity-0 group-hover/zap:opacity-100 transition-opacity pointer-events-none">
                              {rowZapResults[row.id] === 'success' ? 'Sent' : rowZapResults[row.id] === 'failed' ? 'Failed - Click to retry' : rowZapResults[row.id] === 'paused' ? 'Zaps paused' : 'Send to Zap'}
                              <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                            </span>
                          </div>
                        )}
                        {row.row_data['First Name']?.toLowerCase() === 'tester' &&
                         row.row_data['Last Name']?.toLowerCase() === 'mitchell' && (
                          <div className="relative group/undo">
                            <button
                              onClick={() => onUndo(row)}
                              className="p-1.5 text-orange-500 hover:bg-orange-50 rounded transition-colors"
                              aria-label="Undo CRM seat"
                            >
                              <Undo2 className="w-4 h-4" />
                            </button>
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-xs font-medium text-white bg-gray-800 rounded whitespace-nowrap opacity-0 group-hover/undo:opacity-100 transition-opacity pointer-events-none">
                              Undo CRM (Test Only)
                              <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                            </span>
                          </div>
                        )}
                        {row.row_data['First Name']?.trim() && (
                          <div className="relative group/terminate">
                            <button
                              onClick={() => onTerminate(row)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                              aria-label="Terminate agent"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-xs font-medium text-white bg-gray-800 rounded whitespace-nowrap opacity-0 group-hover/terminate:opacity-100 transition-opacity pointer-events-none">
                              Terminate Agent
                              <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange(Math.max(0, page - 1))}
                disabled={page === 0}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <button
                onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
