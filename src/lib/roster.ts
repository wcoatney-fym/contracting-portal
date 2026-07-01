import { supabase } from './supabase';

const MALE_PROFILE_IMAGE =
  'https://storage.googleapis.com/msgsndr/YM9XmCanfO6p28b1sQOH/media/6882b3d23303840127a970fb.png';
const FEMALE_PROFILE_IMAGE =
  'https://storage.googleapis.com/msgsndr/YM9XmCanfO6p28b1sQOH/media/6882b3d2f665866357dfd218.png';

export interface AddAgentToRosterInput {
  agencyName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  npn: string;
  gender: string;
}

export type AddAgentToRosterResult =
  | { status: 'added'; seatNumber: string }
  | { status: 'already_on_roster'; seatNumber: string }
  | { status: 'skipped'; reason: string };

/**
 * Adds an agent to their agency's HIP-portal roster seat (crm_roster), mirroring
 * the seat-assignment logic used by the HIP portal's Add Agent flow
 * (PortalAgentsTab). Fills the standard row_data fields the HIP portal requires.
 *
 * Scope (per product decision 2026-07-01): seat-drop only. It does NOT fire the
 * crm-onboarding-webhook or create a crm_pipeline record — that stays owned by
 * the HIP portal's Add Agent flow. Idempotent: if the NPN is already on the
 * agency's roster, it is a no-op.
 */
export async function addAgentToRoster(
  input: AddAgentToRosterInput
): Promise<AddAgentToRosterResult> {
  const { agencyName, firstName, lastName, email, phone, npn, gender } = input;

  const trimmedNpn = npn.trim();
  if (!agencyName.trim()) {
    return { status: 'skipped', reason: 'No agency assigned to this agent.' };
  }
  if (!trimmedNpn) {
    return { status: 'skipped', reason: 'No NPN on file for this agent.' };
  }

  // Newest roster upload for this agency (matches PortalAgentsTab).
  const { data: upload } = await supabase
    .from('crm_roster_uploads')
    .select('id')
    .eq('agency', agencyName)
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!upload) {
    return {
      status: 'skipped',
      reason: `No roster found for ${agencyName}. Upload a roster first.`,
    };
  }

  const activeUploadId = upload.id;

  const { data: allRows } = await supabase
    .from('crm_roster')
    .select('id, row_data')
    .eq('upload_id', activeUploadId);

  const rows = allRows || [];

  // Idempotency: if this NPN is already seated on the roster, do nothing.
  const existing = rows.find(
    (r) => (r.row_data['Agent NPN'] || '').trim() === trimmedNpn
  );
  if (existing) {
    return {
      status: 'already_on_roster',
      seatNumber: existing.row_data['Seat Number'] || '',
    };
  }

  const numericRows = rows.filter((r) => /^\d+$/.test(r.row_data['Seat Number'] || ''));

  // Carry the agency CRM number forward if the roster has one.
  let crmNumber = '';
  const rowWithCrm = numericRows.find(
    (r) => r.row_data['All Templates | Agent CRM #']?.trim()
  );
  if (rowWithCrm) {
    crmNumber = rowWithCrm.row_data['All Templates | Agent CRM #'];
  }

  const { data: agencyRecord } = await supabase
    .from('crm_agencies')
    .select('calendar_embed_code, agency_url_prefix')
    .eq('name', agencyName)
    .maybeSingle();

  const profileImage = gender === 'Male' ? MALE_PROFILE_IMAGE : FEMALE_PROFILE_IMAGE;

  // Prefer an open/placeholder seat; otherwise append a new one.
  const openSeat = numericRows
    .filter(
      (r) => !r.row_data['First Name']?.trim() || r.row_data['CSR Placeholder'] === 'true'
    )
    .sort((a, b) => Number(a.row_data['Seat Number']) - Number(b.row_data['Seat Number']))[0];

  if (openSeat) {
    const seatNumber = openSeat.row_data['Seat Number'];
    const updatedRowData = {
      ...openSeat.row_data,
      'First Name': firstName.trim(),
      'Last Name': lastName.trim(),
      'Phone': phone.trim(),
      'phone': phone.trim(),
      'Email': email.trim(),
      'email': email.trim(),
      'Agent NPN': trimmedNpn,
      'All Templates | Agent CRM #': crmNumber,
      'All Templates | Agent Profile Image': profileImage,
      'CSR Placeholder': '',
    };

    const { error } = await supabase
      .from('crm_roster')
      .update({ row_data: updatedRowData })
      .eq('id', openSeat.id);

    if (error) throw error;
    return { status: 'added', seatNumber };
  }

  const maxSeat = numericRows.reduce(
    (max, r) => Math.max(max, Number(r.row_data['Seat Number'])),
    0
  );
  const seatNumber = String(maxSeat + 1);
  const urlPrefix = agencyRecord?.agency_url_prefix?.trim() || '';

  const newRowData: Record<string, string> = {
    'Seat Number': seatNumber,
    'First Name': firstName.trim(),
    'Last Name': lastName.trim(),
    'Phone': phone.trim(),
    'phone': phone.trim(),
    'Email': email.trim(),
    'email': email.trim(),
    'Agent NPN': trimmedNpn,
    'All Templates | Agent CRM #': crmNumber,
    'All Templates | Agent Profile Image': profileImage,
    'Calendar Embed Code': agencyRecord?.calendar_embed_code?.trim() || '',
    'Digital Business Card Home Page': urlPrefix
      ? `${urlPrefix}.my-agent-appt.com/r${seatNumber}-click-to-schedule`
      : '',
    'Appt Booked Confirmation Page': urlPrefix
      ? `${urlPrefix}.my-agent-appt.com/r${seatNumber}-youre-confirmed`
      : '',
  };

  const { error } = await supabase
    .from('crm_roster')
    .insert({ upload_id: activeUploadId, row_data: newRowData });

  if (error) throw error;
  return { status: 'added', seatNumber };
}
