import React, { useState } from 'react';
import { Phone, Mail, Globe, Download, CheckCircle2, MessageSquare } from 'lucide-react';

/**
 * Digital Business Card — FYM Contracting
 *
 * Route: /contracting-card  (public, unauthenticated)
 *
 * Generates a .vcf (vCard 3.0) download so agents can save the contracting
 * number to their contacts in one tap. Includes a brief explainer message.
 *
 * To update the contact details, edit CARD_INFO below.
 */

const CARD_INFO = {
  firstName: 'FYM',
  lastName: 'Contracting',
  org: 'FYM Financial',
  title: 'Contracting Team',
  phone: '(000) 000-0000', // ← swap in real GHL number
  phoneRaw: '+10000000000',   // ← E.164 for vCard
  email: 'Contracting@teamfym.com',
  website: 'https://contracting.teamfym.com',
} as const;

function buildVcard(): string {
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${CARD_INFO.firstName} ${CARD_INFO.lastName}`,
    `N:${CARD_INFO.lastName};${CARD_INFO.firstName};;;`,
    `ORG:${CARD_INFO.org}`,
    `TITLE:${CARD_INFO.title}`,
    `TEL;TYPE=WORK,VOICE:${CARD_INFO.phoneRaw}`,
    `EMAIL;TYPE=WORK:${CARD_INFO.email}`,
    `URL:${CARD_INFO.website}`,
    'END:VCARD',
  ].join('\r\n');
}

function downloadVcard() {
  const blob = new Blob([buildVcard()], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'FYM-Contracting.vcf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const ContractingCard: React.FC = () => {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    downloadVcard();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-br from-navy-700 to-navy-900 px-7 pt-10 pb-8 text-center relative">
            <div className="w-20 h-20 rounded-2xl bg-white/10 border-2 border-white/20 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-3xl font-black text-white tracking-tight">FYM</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">FYM Contracting</h1>
            <p className="text-navy-200 text-sm mt-1 font-medium">FYM Financial</p>
          </div>

          {/* Contact fields */}
          <div className="px-6 py-5 space-y-3">
            <a
              href={`tel:${CARD_INFO.phoneRaw}`}
              className="flex items-center gap-3 group"
            >
              <div className="w-9 h-9 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0 group-hover:bg-navy-100 transition-colors">
                <Phone className="w-4 h-4 text-navy-600" />
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-wide text-steel-400 uppercase">Phone / SMS</p>
                <p className="text-sm font-semibold text-steel-900 group-hover:text-navy-700 transition-colors">
                  {CARD_INFO.phone}
                </p>
              </div>
            </a>

            <a
              href={`mailto:${CARD_INFO.email}`}
              className="flex items-center gap-3 group"
            >
              <div className="w-9 h-9 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0 group-hover:bg-navy-100 transition-colors">
                <Mail className="w-4 h-4 text-navy-600" />
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-wide text-steel-400 uppercase">Email</p>
                <p className="text-sm font-semibold text-steel-900 group-hover:text-navy-700 transition-colors">
                  {CARD_INFO.email}
                </p>
              </div>
            </a>

            <a
              href={CARD_INFO.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 group"
            >
              <div className="w-9 h-9 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0 group-hover:bg-navy-100 transition-colors">
                <Globe className="w-4 h-4 text-navy-600" />
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-wide text-steel-400 uppercase">Portal</p>
                <p className="text-sm font-semibold text-steel-900 group-hover:text-navy-700 transition-colors">
                  contracting.teamfym.com
                </p>
              </div>
            </a>
          </div>

          {/* Message banner */}
          <div className="mx-5 mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-2.5">
              <MessageSquare className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800 leading-relaxed">
                <span className="font-bold">Save this contact.</span> We use this number to send your contracting documents, training links, onboarding updates, and important announcements. If it's not in your contacts, our messages go straight to spam.
              </p>
            </div>
          </div>

          {/* Save button */}
          <div className="px-5 pb-7">
            <button
              onClick={handleSave}
              className={`w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 shadow-sm ${
                saved
                  ? 'bg-emerald-500 text-white shadow-emerald-200'
                  : 'bg-navy-700 hover:bg-navy-800 text-white shadow-navy-900/20'
              }`}
            >
              {saved ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Saved to Contacts!
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Save to Contacts
                </>
              )}
            </button>
            <p className="text-center text-[10px] text-steel-400 mt-2.5">
              Downloads a contact file (.vcf) — open it to add to your phone
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-navy-400 mt-5">
          where transparency &amp; opportunity meet
        </p>
      </div>
    </div>
  );
};
