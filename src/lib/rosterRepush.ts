import { supabase } from './supabase';
import { fireCrmOnboardingWebhook, warmUpCrmOnboardingWebhook } from './webhooks';

/**
 * Shared roster -> GHL repush logic.
 *
 * This module centralizes two things that used to live only inside RosterTab:
 *  1. The exact derivation rules for a roster row's hidden DBC/booking fields
 *     (kept in sync with padRosterTo200 in RosterTab / onboardingHelpers).
 *  2. The warmup + throttle + single-retry loop that fires the CRM onboarding
 *     webhook one row at a time so the roster's "Send to Zap" and the new
 *     "Sync Business Info to Roster" flow push identical payloads the same way.
 */

export type RosterRepushRow = {
  id: string;
  row_data: Record<string, string>;
};

// Hidden derived field keys (mirrors padRosterTo200). Hidden from the roster
// table view but still included in the zap payload.
export const DBC_HOME_PAGE_KEY = 'Digital Business Card Home Page';
export const APPT_CONFIRMATION_KEY = 'Appt Booked Confirmation Page';
export const CALENDAR_EMBED_KEY = 'Calendar Embed Code';

// Timing constants shared by every repush (kept identical to the original
// RosterTab implementation so behavior does not diverge).
const WARMUP_SETTLE_MS = 1500;
const PER_ROW_DELAY_MS = 3000;
const RETRY_INITIAL_DELAY_MS = 5000;
const RETRY_PER_ROW_DELAY_MS = 5000;

const seatOf = (row: RosterRepushRow): number => Number(row.row_data['Seat Number']);

const isPopulated = (row: RosterRepushRow): boolean => !!row.row_data['First Name']?.trim();

/**
 * Compute the derived hidden-field values a row should have given the current
 * agency url prefix + calendar embed. Mirrors the generation logic in
 * padRosterTo200 exactly (do not reinvent).
 */
export function deriveHiddenFields(
  seat: number,
  urlPrefix: string,
  calendarEmbed: string,
): Record<string, string> {
  const fields: Record<string, string> = {};
  fields[CALENDAR_EMBED_KEY] = calendarEmbed;
  if (urlPrefix && seat) {
    fields[DBC_HOME_PAGE_KEY] = `${urlPrefix}.my-agent-appt.com/r${seat}-click-to-schedule`;
    fields[APPT_CONFIRMATION_KEY] = `${urlPrefix}.my-agent-appt.com/r${seat}-youre-confirmed`;
  } else {
    fields[DBC_HOME_PAGE_KEY] = '';
    fields[APPT_CONFIRMATION_KEY] = '';
  }
  return fields;
}

export type RegenerateResult = {
  /** All numeric-seat rows for the agency's active upload, after regeneration. */
  allRows: RosterRepushRow[];
  /** Row ids whose hidden derived fields actually changed. */
  changedRowIds: Set<string>;
};

/**
 * Regenerate the hidden derived fields for every roster row of an agency's
 * active (latest) upload and persist changes. Returns which rows changed so the
 * caller can default to a changed-only repush.
 */
export async function regenerateAgencyRosterHiddenFields(
  agencyName: string,
  urlPrefixRaw: string | null | undefined,
  calendarEmbedRaw: string | null | undefined,
): Promise<RegenerateResult> {
  const urlPrefix = (urlPrefixRaw || '').trim();
  const calendarEmbed = (calendarEmbedRaw || '').trim();

  // Latest upload for this agency (mirrors RosterTab's "active" selection).
  const { data: upload } = await supabase
    .from('crm_roster_uploads')
    .select('id')
    .eq('agency', agencyName)
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!upload) {
    return { allRows: [], changedRowIds: new Set() };
  }

  const { data: rows } = await supabase
    .from('crm_roster')
    .select('id, row_data')
    .eq('upload_id', upload.id);

  const numericRows = (rows || []).filter(
    (r) => /^\d+$/.test(r.row_data['Seat Number'] || ''),
  ) as RosterRepushRow[];

  const changedRowIds = new Set<string>();
  const updatedRows: RosterRepushRow[] = [];

  for (const row of numericRows) {
    const seat = seatOf(row);
    const derived = deriveHiddenFields(seat, urlPrefix, calendarEmbed);

    const changed = Object.entries(derived).some(
      ([key, val]) => (row.row_data[key] || '') !== val,
    );

    if (changed) {
      const updatedData = { ...row.row_data, ...derived };
      const { error } = await supabase
        .from('crm_roster')
        .update({ row_data: updatedData })
        .eq('id', row.id);
      if (!error) {
        changedRowIds.add(row.id);
        updatedRows.push({ id: row.id, row_data: updatedData });
        continue;
      }
    }
    updatedRows.push(row);
  }

  updatedRows.sort((a, b) => seatOf(a) - seatOf(b));
  return { allRows: updatedRows, changedRowIds };
}

/** Build the exact onboarding webhook payload for a roster row. */
export function buildOnboardingPayload(row: RosterRepushRow, agency: string) {
  return {
    seatNumber: row.row_data['Seat Number'] || '',
    agentNpn: row.row_data['Agent NPN'] || '',
    firstName: row.row_data['First Name'] || '',
    lastName: row.row_data['Last Name'] || '',
    email: row.row_data['Email'] || '',
    phone: row.row_data['Phone'] || '',
    profileImage: row.row_data['All Templates | Agent Profile Image'] || '',
    crmNumber: row.row_data['All Templates | Agent CRM #'] || '',
    agency,
    digitalBusinessCardUrl: row.row_data[DBC_HOME_PAGE_KEY] || '',
    confirmationPageUrl: row.row_data[APPT_CONFIRMATION_KEY] || '',
    calendarEmbedCode: row.row_data[CALENDAR_EMBED_KEY] || '',
  };
}

export type RepushProgress = {
  sent: number;
  failed: number;
  total: number;
};

export type RepushRowStatus = 'success' | 'failed';

export type RepushOptions = {
  onProgress?: (progress: RepushProgress) => void;
  onRowResult?: (rowId: string, status: RepushRowStatus) => void;
  /** Skip the warmup ping+settle (used for single-row fires). */
  skipWarmup?: boolean;
};

export type RepushResult = {
  sent: number;
  failed: number;
  total: number;
  paused: boolean;
  rowResults: Record<string, RepushRowStatus>;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Fire the CRM onboarding webhook for the given roster rows, one at a time,
 * reusing the warmup + throttle + single-retry logic. Respects the agency's
 * zaps_paused flag (returns paused=true and sends nothing when paused).
 *
 * Only populated rows (with a First Name) are pushed; empty seats are skipped
 * since there is no agent to onboard.
 */
export async function pushRosterRowsToGhl(
  agencyName: string,
  rows: RosterRepushRow[],
  options: RepushOptions = {},
): Promise<RepushResult> {
  const { data: agencyData } = await supabase
    .from('hierarchy_agencies')
    .select('zaps_paused')
    .eq('name', agencyName)
    .maybeSingle();

  const populated = rows.filter(isPopulated);
  const total = populated.length;
  const rowResults: Record<string, RepushRowStatus> = {};

  if (agencyData?.zaps_paused) {
    return { sent: 0, failed: 0, total, paused: true, rowResults };
  }

  options.onProgress?.({ sent: 0, failed: 0, total });

  if (total === 0) {
    return { sent: 0, failed: 0, total: 0, paused: false, rowResults };
  }

  if (!options.skipWarmup) {
    // Warm up the edge function to eliminate cold start issues.
    await warmUpCrmOnboardingWebhook();
    await sleep(WARMUP_SETTLE_MS);
  }

  let sent = 0;
  let failed = 0;
  const failedRows: RosterRepushRow[] = [];

  for (const row of populated) {
    const success = await fireCrmOnboardingWebhook(buildOnboardingPayload(row, agencyName));
    if (success) {
      sent++;
      rowResults[row.id] = 'success';
      options.onRowResult?.(row.id, 'success');
    } else {
      failed++;
      failedRows.push(row);
      rowResults[row.id] = 'failed';
      options.onRowResult?.(row.id, 'failed');
    }
    options.onProgress?.({ sent, failed, total });
    await sleep(PER_ROW_DELAY_MS);
  }

  // Retry failed rows once with a longer delay.
  if (failedRows.length > 0) {
    await sleep(RETRY_INITIAL_DELAY_MS);
    for (const row of failedRows) {
      const success = await fireCrmOnboardingWebhook(buildOnboardingPayload(row, agencyName));
      if (success) {
        sent++;
        failed--;
        rowResults[row.id] = 'success';
        options.onRowResult?.(row.id, 'success');
        options.onProgress?.({ sent, failed, total });
      }
      await sleep(RETRY_PER_ROW_DELAY_MS);
    }
  }

  return { sent, failed, total, paused: false, rowResults };
}
