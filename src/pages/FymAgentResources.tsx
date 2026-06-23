import React, { useState } from 'react';
import { GraduationCap, Footprints, Monitor, Building2, Users, ChevronDown, ChevronRight, ExternalLink, BookOpen, DollarSign, LifeBuoy, MessageSquare, Receipt, ClipboardCheck, Phone, Mail, Shield } from 'lucide-react';

type Section = 'training' | 'onboarding' | 'carriers' | 'contacts';

const SECTIONS: { key: Section; title: string; description: string; icon: React.FC<{ className?: string }> }[] = [
  { key: 'training', title: 'Training Links', description: 'Videos and resources to get you up to speed', icon: GraduationCap },
  { key: 'onboarding', title: 'Onboarding Steps', description: 'Platform setup guides and instructions', icon: Footprints },
  { key: 'carriers', title: 'Carrier Information', description: 'Carrier contacts, releases, and termination details', icon: Building2 },
  { key: 'contacts', title: 'FYM Contacts', description: 'Who to reach out to and when', icon: Users },
];

export const FymAgentResources: React.FC = () => {
  const [expanded, setExpanded] = useState<Set<Section>>(new Set(['training', 'onboarding', 'carriers', 'contacts']));

  const toggle = (key: Section) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shadow-md">
            <BookOpen className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">FYM Agent Resources</h1>
            <p className="text-sm text-slate-500">Everything you need to succeed as an FYM agent</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        {/* Training Links */}
        <SectionCard
          section={SECTIONS[0]}
          isExpanded={expanded.has('training')}
          onToggle={() => toggle('training')}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ResourceCard
              icon={GraduationCap}
              title="Bianca's Training"
              description="Comprehensive agent training walkthrough"
              color="bg-violet-50 text-violet-700 border-violet-200"
            />
            <ResourceCard
              icon={DollarSign}
              title="Commission Schedule"
              description="Zach's explanation of how commissions work"
              color="bg-emerald-50 text-emerald-700 border-emerald-200"
            />
            <ResourceCard
              icon={LifeBuoy}
              title="Life Cycle of an Agent"
              description="Zach's overview of the agent journey from start to finish"
              color="bg-sky-50 text-sky-700 border-sky-200"
            />
          </div>
        </SectionCard>

        {/* Onboarding Steps */}
        <SectionCard
          section={SECTIONS[1]}
          isExpanded={expanded.has('onboarding')}
          onToggle={() => toggle('onboarding')}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600 font-medium">Platform setup instructions to complete during onboarding:</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <PlatformCard
                icon={MessageSquare}
                name="Slack"
                description="Team communication and direct messaging"
                step={1}
              />
              <PlatformCard
                icon={Receipt}
                name="Bill.com"
                description="Payment and commission processing"
                step={2}
              />
              <PlatformCard
                icon={ClipboardCheck}
                name="Enrollhere"
                description="Client enrollment platform"
                step={3}
              />
              <PlatformCard
                icon={Monitor}
                name="Agent Landing Page"
                description="Your personal agent portal and client-facing page"
                step={4}
              />
            </div>
          </div>
        </SectionCard>

        {/* Carriers Information */}
        <SectionCard
          section={SECTIONS[2]}
          isExpanded={expanded.has('carriers')}
          onToggle={() => toggle('carriers')}
        >
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">Releases &amp; Terminations</p>
                  <p className="text-xs text-amber-700 mt-1">
                    For carrier release or termination requests, please contact your assigned CSR or the contracting team directly.
                    Each carrier has specific release procedures and timeframes.
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <CarrierCard name="Carrier Contacts" description="Full list of carrier representatives and support lines" />
              <CarrierCard name="Release Procedures" description="How to request a release from a carrier" />
              <CarrierCard name="Termination Process" description="Steps and explanations for agent terminations" />
            </div>
          </div>
        </SectionCard>

        {/* FYM Contacts */}
        <SectionCard
          section={SECTIONS[3]}
          isExpanded={expanded.has('contacts')}
          onToggle={() => toggle('contacts')}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600 font-medium">FYM team members and who to contact for what:</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <ContactCard
                name="Contracting Team"
                role="Agent onboarding, paperwork, and licensing questions"
                email="Contracting@teamFYM.com"
              />
              <ContactCard
                name="CRM / Tech Support"
                role="Platform issues, CRM access, and portal support"
                email="Support@teamFYM.com"
              />
              <ContactCard
                name="Commission / Billing"
                role="Commission inquiries, payment issues, Bill.com setup"
                email="Billing@teamFYM.com"
              />
              <ContactCard
                name="Leadership / Escalations"
                role="Escalated issues, partnership inquiries, agency questions"
                email="Admin@teamFYM.com"
              />
            </div>
          </div>
        </SectionCard>
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <p className="text-xs text-slate-400">FYM Financial &mdash; Where Transparency &amp; Opportunity Meet</p>
          <p className="text-xs text-slate-400">Questions? Email Contracting@teamFYM.com</p>
        </div>
      </footer>
    </div>
  );
};

const SectionCard: React.FC<{
  section: typeof SECTIONS[number];
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ section, isExpanded, onToggle, children }) => {
  const Icon = section.icon;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-6 py-5 text-left"
      >
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-slate-700" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{section.description}</p>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
        )}
      </button>
      {isExpanded && (
        <div className="px-6 pb-6 pt-0">
          <div className="border-t border-slate-100 pt-5">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

const ResourceCard: React.FC<{
  icon: React.FC<{ className?: string }>;
  title: string;
  description: string;
  color: string;
}> = ({ icon: Icon, title, description, color }) => (
  <div className={`rounded-xl border p-4 transition-all hover:shadow-sm cursor-pointer ${color}`}>
    <div className="flex items-start gap-3">
      <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs mt-1 opacity-80">{description}</p>
      </div>
      <ExternalLink className="w-3.5 h-3.5 opacity-50 flex-shrink-0 mt-0.5" />
    </div>
  </div>
);

const PlatformCard: React.FC<{
  icon: React.FC<{ className?: string }>;
  name: string;
  description: string;
  step: number;
}> = ({ icon: Icon, name, description, step }) => (
  <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all cursor-pointer">
    <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
      {step}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-slate-600" />
        <p className="text-sm font-semibold text-slate-900">{name}</p>
      </div>
      <p className="text-xs text-slate-500 mt-0.5">{description}</p>
    </div>
    <ExternalLink className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
  </div>
);

const CarrierCard: React.FC<{
  name: string;
  description: string;
}> = ({ name, description }) => (
  <div className="p-4 rounded-xl border border-slate-200 bg-white hover:shadow-sm transition-all cursor-pointer">
    <div className="flex items-start gap-3">
      <Building2 className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-sm font-semibold text-slate-900">{name}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
    </div>
  </div>
);

const ContactCard: React.FC<{
  name: string;
  role: string;
  email: string;
}> = ({ name, role, email }) => (
  <div className="p-4 rounded-xl border border-slate-200 bg-white hover:shadow-sm transition-all">
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
        <Phone className="w-4 h-4 text-slate-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900">{name}</p>
        <p className="text-xs text-slate-500 mt-0.5">{role}</p>
        <a
          href={`mailto:${email}`}
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-1.5 font-medium"
        >
          <Mail className="w-3 h-3" />
          {email}
        </a>
      </div>
    </div>
  </div>
);
