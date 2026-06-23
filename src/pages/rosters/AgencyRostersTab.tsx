import React, { useState, useEffect } from 'react';
import {
  Building2,
  FileSpreadsheet,
  Eye,
  ArrowLeft,
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { supabase, generateSlug, RESERVED_SLUGS } from '../../lib/supabase';

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

type AgencyWithRoster = {
  name: string;
  upload: RosterUpload | null;
  populatedCount: number;
  inCrm: boolean;
};

const PAGE_SIZE = 50;

export const AgencyRostersTab: React.FC = () => {
  const [agencies, setAgencies] = useState<AgencyWithRoster[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeUpload, setActiveUpload] = useState<RosterUpload | null>(null);
  const [activeAgency, setActiveAgency] = useState<string>('');
  const [allRows, setAllRows] = useState<RosterRow[]>([]);
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [addingToCrm, setAddingToCrm] = useState<string | null>(null);

  useEffect(() => {
    loadAgencies();
  }, []);

  useEffect(() => {
    if (activeUpload) {
      loadRows();
    }
  }, [activeUpload]);

  const loadAgencies = async () => {
    setLoading(true);

    const { data: fymRecord } = await supabase
      .from('crm_agencies')
      .select('id')
      .eq('name', 'FYM')
      .maybeSingle();

    const fymId = fymRecord?.id;

    let agencyQuery = supabase
      .from('crm_agencies')
      .select('name')
      .eq('is_active', true)
      .order('name');

    if (fymId) {
      agencyQuery = agencyQuery.or(`id.eq.${fymId},parent_agency_id.eq.${fymId}`);
    }

    const { data: allCrmAgencies } = await supabase
      .from('crm_agencies')
      .select('name')
      .eq('is_active', true);

    const allCrmNames = new Set((allCrmAgencies || []).map((a: { name: string }) => a.name));

    const [agencyRes, uploadsRes] = await Promise.all([
      agencyQuery,
      supabase
        .from('crm_roster_uploads')
        .select('*')
        .order('uploaded_at', { ascending: false }),
    ]);

    const fymFamilyNames: string[] = (agencyRes.data || []).map((a: { name: string }) => a.name);
    const uploads = uploadsRes.data || [];

    const uploadByAgency: Record<string, RosterUpload> = {};
    for (const u of uploads) {
      if (u.agency && !uploadByAgency[u.agency]) {
        uploadByAgency[u.agency] = u;
      }
    }

    // Find agencies from roster uploads that aren't in CRM at all
    const nonCrmRosterAgencies: string[] = [];
    for (const agencyName of Object.keys(uploadByAgency)) {
      if (!allCrmNames.has(agencyName) && !fymFamilyNames.includes(agencyName)) {
        nonCrmRosterAgencies.push(agencyName);
      }
    }
    nonCrmRosterAgencies.sort();

    const allNames = [...fymFamilyNames, ...nonCrmRosterAgencies];

    const uploadIds = allNames
      .map((name) => uploadByAgency[name]?.id)
      .filter(Boolean) as string[];

    let populatedByUploadId: Record<string, number> = {};

    if (uploadIds.length > 0) {
      const { data: rosterRows } = await supabase
        .from('crm_roster')
        .select('upload_id, row_data')
        .in('upload_id', uploadIds);

      if (rosterRows) {
        for (const row of rosterRows) {
          if (row.row_data['First Name']?.trim()) {
            populatedByUploadId[row.upload_id] = (populatedByUploadId[row.upload_id] || 0) + 1;
          }
        }
      }
    }

    const result: AgencyWithRoster[] = allNames.map((name) => ({
      name,
      upload: uploadByAgency[name] || null,
      populatedCount: uploadByAgency[name] ? (populatedByUploadId[uploadByAgency[name].id] || 0) : 0,
      inCrm: fymFamilyNames.includes(name),
    }));

    setAgencies(result);
    setLoading(false);
  };

  const handleAddToCrm = async (agencyName: string) => {
    setAddingToCrm(agencyName);

    const slug = generateSlug(agencyName);
    if (RESERVED_SLUGS.has(slug)) {
      alert(`Cannot add "${agencyName}" - name conflicts with a reserved URL path.`);
      setAddingToCrm(null);
      return;
    }

    const { data: fymRecord } = await supabase
      .from('crm_agencies')
      .select('id')
      .eq('name', 'FYM')
      .maybeSingle();

    if (!fymRecord) {
      alert('Could not find FYM parent agency.');
      setAddingToCrm(null);
      return;
    }

    const portalPassword = `${agencyName}CRMPortal!`;

    const { error } = await supabase.from('crm_agencies').insert({
      name: agencyName,
      agency_type: 'sub',
      parent_agency_id: fymRecord.id,
      is_active: true,
      onboarding_status: 'onboarding_complete',
      portal_password: portalPassword,
      date_created: new Date().toISOString().slice(0, 10),
    });

    if (error) {
      alert(`Failed to add agency: ${error.message}`);
      setAddingToCrm(null);
      return;
    }

    await loadAgencies();
    setAddingToCrm(null);
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

  const handleView = (agency: AgencyWithRoster) => {
    if (!agency.upload) return;
    setActiveAgency(agency.name);
    setActiveUpload(agency.upload);
    setPage(0);
    setSearchTerm('');
    setAllRows([]);
  };

  const handleBack = () => {
    setActiveUpload(null);
    setActiveAgency('');
    setAllRows([]);
    setSearchTerm('');
    setPage(0);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

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

  if (loading) {
    return (
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 bg-white rounded-xl border border-steel-200 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (activeUpload) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-navy-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to All Rosters
          </button>
          <div className="h-5 w-px bg-gray-300" />
          <h2 className="text-lg font-bold text-navy-700">{activeAgency} Roster</h2>
          <span className="text-sm text-gray-400">
            {totalRows} agents
          </span>
        </div>

        <div className="bg-white rounded-xl border border-steel-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, phone, email..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-medium text-gray-600 w-20">Seat</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">First Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Last Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Phone</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">NPN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedRows.map((row) => {
                  const d = row.row_data;
                  const hasAgent = !!(d['First Name']?.trim());
                  return (
                    <tr
                      key={row.id}
                      className={hasAgent ? 'bg-white' : 'bg-gray-50/50'}
                    >
                      <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">
                        {d['Seat Number'] || '-'}
                      </td>
                      <td className={`px-4 py-2.5 ${hasAgent ? 'text-gray-900 font-medium' : 'text-gray-300'}`}>
                        {d['First Name'] || '--'}
                      </td>
                      <td className={`px-4 py-2.5 ${hasAgent ? 'text-gray-900' : 'text-gray-300'}`}>
                        {d['Last Name'] || '--'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {d['Phone'] || d['phone'] || '--'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {d['Email'] || d['email'] || '--'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 font-mono text-xs">
                        {d['Agent NPN'] || '--'}
                      </td>
                    </tr>
                  );
                })}
                {paginatedRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      {searchTerm ? 'No matching agents found.' : 'No roster data.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, totalRows)} of {totalRows}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-600">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-navy-700">Agency Rosters</h2>
        <p className="text-sm text-gray-500 mt-1">
          FYM, Wisechoice, Aspire, and affiliated agency rosters. Updated externally.
        </p>
      </div>

      {agencies.length === 0 ? (
        <div className="bg-white rounded-xl border border-steel-200 p-12 text-center">
          <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No active agencies found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agencies.map((agency) => (
            <div
              key={agency.name}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="bg-gray-50 px-5 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-navy-600 flex items-center justify-center flex-shrink-0">
                      <FileSpreadsheet className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-800 truncate">{agency.name}</h3>
                  </div>
                  {agency.inCrm ? (
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-medium text-emerald-600">In CRM</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAddToCrm(agency.name)}
                      disabled={addingToCrm === agency.name}
                      className="flex items-center gap-1.5 flex-shrink-0 ml-2 px-2.5 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors text-xs font-medium disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {addingToCrm === agency.name ? 'Adding...' : 'Add to CRM'}
                    </button>
                  )}
                </div>
              </div>

              <div className="p-5">
                {agency.upload ? (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-700">
                        {agency.populatedCount} agents
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-4">
                      Updated {formatDate(agency.upload.uploaded_at)}
                    </p>
                    <button
                      onClick={() => handleView(agency)}
                      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition-colors text-sm font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      View Roster
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <p className="text-sm text-gray-400">No roster uploaded</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
