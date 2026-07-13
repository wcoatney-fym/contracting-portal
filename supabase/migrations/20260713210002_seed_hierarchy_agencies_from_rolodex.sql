/*
  # Seed hierarchy_agencies from Will's UNL rolodex

  Source: UNL_202JVV00_2026-06-12.csv (96 unique agency rows)
  As of: 2026-06-12

  Inserts all 96 agencies from the FYM downline. Agencies already in the
  table (matched by slug) are skipped — ON CONFLICT (slug) DO NOTHING.
  Existing 13 CRM-enabled agencies are untouched.

  Fields populated:
    name                — from CSV Last Name (agency name)
    slug                — url-safe kebab-case derived from name
    contracting_email   — from CSV Email column
    agency_state        — from CSV State column
    unl_writing_number  — from CSV Agent Number column
    unl_status          — from CSV Agent Status column (Active/Pending/Terminated)
    agency_type         — 'sub' (all are sub-agencies under FYM)
    onboarding_status   — 'pending_csr_assignment' (incomplete until intake submitted)
    is_active           — true
    crm_enabled         — false (invisible to CRM Ops until explicitly toggled)
    date_created        — today

  Fields left NULL (filled by agency intake form submission):
    agency_phone, agency_npn, agency_ein, principal_agent,
    principal_agent_npn, contracting_contact, business_name,
    parent_agency_id (hierarchy wiring done separately after all agencies exist)
*/

INSERT INTO public.hierarchy_agencies
  (name, slug, contracting_email, agency_state, unl_writing_number, unl_status,
   agency_type, onboarding_status, is_active, crm_enabled, date_created)
VALUES
  ('369 Insurance Inc',                    '369-insurance',                      'nick@vlachoscpa.com',                          'CO', '202NPK00', 'Pending',    'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('ACA Agent LLC',                         'aca-agent',                          'lspinner@acaagent.com',                        'FL', '202NLM00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Agility Health Group LLC',              'agility-health-group',               'contractingteam@agilityhg.com',                'GA', '202KTH00', 'Pending',    'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Aidmed Insurance LLC',                  'aidmed-insurance',                   'tylerbayside@gmail.com',                       'FL', '202NL800', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Alfred Robinson',                       'alfred-robinson',                    'alfredus1964@gmail.com',                       'TN', '202JL300', 'Pending',    'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Almond Family Insurance LLC',           'almond-family-insurance',            'joe@almond-insurance.com',                     'IL', '202NBF00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('American Entitlements LLC',             'american-entitlements',              'brian.tobias@americanentitlements.com',         'TX', '202NDY00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('American Senior Health And Life LLC',   'american-senior-health-and-life',    'americanseniorhealthandlife@gmail.com',         'FL', '202NDU00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('AP Insurance Partners',                 'ap-insurance-partners',              'aspinner13@icloud.com',                        'FL', '202NL700', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Archon Insurance Agency, LLC',          'archon-insurance-agency',            'martha.archon1@gmail.com',                     'TX', '202NJR00', 'Pending',    'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Axia Senior Insurance Advisors',        'axia-senior-insurance-advisors',     'daniel@betterhealth.insure',                   'AZ', '202JCT00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Better Insurance Management',           'better-insurance-management',        'bim204@gmail.com',                             'NJ', '202NF700', 'Pending',    'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Blueprint Health Agency',               'blueprint-health-agency',            'kevin@blueprinthealthagency.com',              'FL', '202NG900', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Breelee-Cole, LLC',                     'breelee-cole',                       'dawnhebert01@yahoo.com',                       'LA', '202NF600', 'Pending',    'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Brooks Automation Empire LLC',          'brooks-automation-empire',           'corporate@medicaregiants.com',                 'MD', '202NFL00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Brown Networking Solutions',            'brown-networking-solutions',         'kimberlybrown843@gmail.com',                   'SC', '202JW200', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('BWL Insurance II LLC',                  'bwl-insurance-ii',                   'ab@bwlinsurance.com',                          'FL', '202NHJ00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Charthern Consulting',                  'charthern-consulting',               'insurancenow@charthernconsulting.com',         'GA', '202JRM00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Clear Path Coverage',                   'clear-path-coverage',                'binh@clearpathcoverage.com',                   'CO', '202NNW00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Clearview Health Advisors',             'clearview-health-advisors',          'ym@cvhealthins.com',                           'FL', '202BJN00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Complete Care Solutions LC',            'complete-care-solutions-lc',         NULL,                                           'SC', '202BJM00', 'Pending',    'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Crystal Coast Marketing Group',         'crystal-coast-marketing-group',      'willcrandell123@icloud.com',                   'NC', '202NG400', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Dawkins Agency',                        'dawkins-agency',                     'dawkinsinsurancegroup@gmail.com',              'SC', '202JMB00', 'Pending',    'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('DH Insurance Group',                    'dh-insurance-group',                 'bhcontracting@dhinsurancegroup.com',           'FL', '202NGA00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Drivegen Media DBA Pro Health Partners','drivegen-media-dba-pro-health-partners','itzik@drivegenmedia.com',                   'FL', '202NGF00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('E&E Financial Solutions LLC',           'e-e-financial-solutions',            'eddiewhite2nd@gmail.com',                      'SC', '202A9V00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('East West Senior Solutions LLC',        'east-west-senior-solutions',         'ryan@ewssconsulting.com',                      'MD', '202NFP00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('EF Marshall Agency',                    'ef-marshall-agency',                 'marshall.eugene@gmail.com',                    'MD', '202NG700', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Elite Insurance Group Agency, LLC',     'elite-insurance-group-agency',       'hdavis@elite-insgroup.com',                    'GA', '202NKX00', 'Pending',    'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Emery Insurance LLC',                   'emery-insurance',                    'brock@teameig.com',                            'UT', '202NN500', 'Terminated', 'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Essential Health Affiliates LLC',       'essential-health-affiliates',        'alimehdi47@gmail.com',                         'TX', '202NGD00', 'Pending',    'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Evercare Insurance Inc',                'evercare-insurance',                 'info@evercareins.ai',                          'FL', '202NLH00', 'Pending',    'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Family Financial Consultants LLC',      'family-financial-consultants',       'donalddoejr@gmail.com',                        'GA', '202JPD00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Family First Insurance Advisors LLC',   'family-first-insurance-advisors',    'steve@familyfirstia.com',                      'FL', '202NHK00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Freedom Financial Consultants LLC',     'freedom-financial-consultants',      'ike@ffcse.com',                                'SC', '202JNZ00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Gap Insurance Group LLC',               'gap-insurance-group',                'contracting@thegapinsurancegroup.com',         'FL', '202NM600', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Guardian Benefits Inc',                 'guardian-benefits',                  'customerservice@guardian-benefits.com',        'FL', '202NEW00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Guide To Insure, LLC',                  'guide-to-insure',                    'mmarkland@atmapmf.com',                        'UT', '202NHS00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Health Wise',                           'health-wise',                        'wscott2769@gmail.com',                         'FL', '202NPC00', 'Terminated', 'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Healthcare123 Insurance Services, LLC', 'healthcare123-insurance-services',   'mike@healthcare123.com',                       'FL', '202NMJ00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Highland Health Direct, LLC',           'highland-health-direct',             'daniel@highlandhealthdirect.com',              'FL', '202JZ200', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Insurance Sales Experts',               'insurance-sales-experts',            'joe@insurancesalesexperts.com',                'OH', '202NEP00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Insure Choice',                         'insure-choice',                      'donna@insurechoicegroup.com',                  'TX', '202NM700', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Insure Health Now',                     'insure-health-now',                  'justin@insurehealthnow.com',                   'FL', '202NHH00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Integrity Brokers LLC',                 'integrity-brokers',                  'millieperez70@gmail.com',                      'AZ', '202KRT00', 'Pending',    'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('JAR Insurance Services',               'jar-insurance-services',             'jarcorp@jaragent.com',                         'CA', '202NNK00', 'Pending',    'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('JTM Insurance & Financial Group LLC',   'jtm-insurance-financial-group',      'justinmatt@jtmif.com',                         'FL', '202NHR00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('KM&RM Solutions LLC',                   'km-rm-solutions',                    'kevin@yourseniorbenefitssolutions.com',        'GA', '202NMM00', 'Pending',    'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Legacy Family Advisors',                'legacy-family-advisors',             'lenionjr@gmail.com',                           'GA', '202JLB00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Local Heritage Benefits, LP',           'local-heritage-benefits',            'management@lhbenefits.com',                    'TX', '202JX600', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Longevity Capital Insurance, LLC',      'longevity-capital-insurance',        'gbruce@lcinsurancenow.com',                    'GA', '202KFZ00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Magnolia Health Advisors',              'magnolia-health-advisors',           'terrence@magnoliahealthcare.com',              'FL', '202NPH00', 'Pending',    'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Markham Financial Assurance',           'markham-financial-assurance',        'fmmarkham@gmail.com',                          'NC', '202DAX00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Matthews Health Solutions LLC',         'matthews-health-solutions',          'matthewsjam1@aol.com',                         'MD', '202NG800', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('McKenzie Real Holdings LLC',            'mckenzie-real-holdings',             'contracting@realseniormanagement.com',         'GA', '202NL900', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Med Advantage Advisors',                'med-advantage-advisors',             'contact@medadvantageadvisors.com',             'FL', '202NMD00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Medicare Health Advisors',              'medicare-health-advisors',           'maxjaffy11@gmail.com',                         'FL', '202NCX00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Medicare Medical Benefits LLC',         'medicare-medical-benefits',          'nikki@nikkicrouse.com',                        'AZ', '202JM200', 'Pending',    'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Miranda Breaux LLC',                    'miranda-breaux',                     'mirandabreaux.insurance@gmail.com',            'LA', '202NF300', 'Pending',    'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('MyHealthAngel Insurance LLC',           'myhealthangel-insurance',            'insurance@myhealthangel.com',                  'FL', '202NEY00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('National Senior Benefit Advisors',      'national-senior-benefit-advisors',   'shaun.hunsaker@nsbagroup.com',                 'CA', '202NGZ00', 'Pending',    'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('National Underwriting Service LLC',     'national-underwriting-service',      'nick@fexcontracting.com',                      'PA', '202NFD00', 'Pending',    'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('NFG Insurance Solutions Inc',           'nfg-insurance-solutions',            'primeoasisd@gmail.com',                        'FL', '202NM500', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Partners In Care Insurance LLC',        'partners-in-care-insurance',         'max@picinsurancegroup.com',                    'FL', '202NLR00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Pitch Health Solutions LLC',            'pitch-health-solutions',             'shawn@pitchhealthsolutions.com',               'FL', '202NJF00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Platinum Choice Healthcare LLC',        'platinum-choice-healthcare',         'admin@platinumchoicehealthcare.com',           'FL', '202NFY00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Platinum Shield Insurance LLC',         'platinum-shield-insurance',          'contracting@platinumshield.com',               'IN', '202NFS00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Providence Group',                      'providence-group',                   'drp@providence1818.com',                       'FL', '202NFQ00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Residual Brothers LLC',                 'residual-brothers',                  'andy@residualbrothersllc.com',                 'OH', '202KEZ00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Reviva Health Group LLC',               'reviva-health-group',                'revivahealthgroup@gmail.com',                  'FL', '202NNL00', 'Pending',    'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Rhonda Ridgely Agency LLC',             'rhonda-ridgely-agency',              'rhonda@rhondaridgelyagency.com',               'VA', '202JPC00', 'Pending',    'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('RL Advisors',                           'rl-advisors',                        'joe@teampclub.com',                            'WI', '202KYC00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Salud Network LLC',                     'salud-network',                      'jnaumann@saludnetwork.com',                    'AZ', '202AJA00', 'Pending',    'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Savage Financial Group Inc',            'savage-financial-group',             'ess6546@aol.com',                              'FL', '202NKR00', 'Pending',    'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Senior Benefits Agency LLC',            'senior-benefits-agency',             'joshua@seniorbenefitsagency.net',              'MA', '202NEG00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Senior Health Advocates',               'senior-health-advocates',            'admin@seniorha.com',                           'FL', '202NFT00', 'Pending',    'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Senior Market Consultants LLC',         'senior-market-consultants',          'rmoore.smcllc@gmail.com',                      'NC', '202NFA00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Senior Market Insurance LLC',           'senior-market-insurance',            'rgean123@gmail.com',                           'AZ', '202JCS00', 'Pending',    'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Senior Services Direct',               'senior-services-direct',             'contracting@seniorservicesdirect.com',         'AL', '202NE400', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Shore Legacy Insurance, LLC',           'shore-legacy-insurance',             'contact@shorelegacybenefits.com',              'FL', '202NP400', 'Pending',    'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Signature Medicare Solutions',          'signature-medicare-solutions',       'brad@signaturemedicaresolutions.com',          'FL', '202NG100', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Silver Care Advisors, LLC',             'silver-care-advisors',               'agentcontracting@silverhealthadvisors.com',    'AZ', '202NNB00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Steel City Financial Services Inc',     'steel-city-financial-services',      'dena@teamscf.com',                             'NC', '202GDY00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('TG Squared Asset Consultants LLC',      'tg-squared-asset-consultants',       'tgsquared.ac@gmail.com',                       'GA', '202KFE00', 'Pending',    'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('The Possibilities Group, LLC',          'the-possibilities-group',            'nekadoe@yahoo.com',                            'GA', '202BNR00', 'Terminated', 'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('The Premier Agency LLC',                'the-premier-agency',                 'j.heubach@premieragentnet.com',                'AZ', '202ACY00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Thirteen Five, LLC',                    'thirteen-five',                      'mike@medicaremikeaz.com',                      'AZ', '202JTX00', 'Pending',    'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Trucare Insurance Group Inc',           'trucare-insurance-group',            'bvanleer@trucareinsure.com',                   'NC', '202NJC00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('UBG Insurance LLC',                     'ubg-insurance',                      'ubginsurance4@gmail.com',                      'OH', '202NML00', 'Pending',    'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Unified Growth Partners',              'unified-growth-partners',            'contracting@unifiedgrowthpartners.com',        'CA', '202NPT00', 'Pending',    'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Valeir Insurance LLC',                  'valeir-insurance',                   'valeirinsurance@gmail.com',                    'AZ', '202KNM00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Vargas Investment Enterprises LLC',     'vargas-investment-enterprises',      'andres@texasmedicalcareplans.com',             'TX', '202NJE00', 'Pending',    'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Vivid Financial Services LLC',          'vivid-financial-services',           'melindalsi@yahoo.com',                         'SC', '202JMJ00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Wealth Alliance Group',                 'wealth-alliance-group',              'nkbrown@wealthalliancegrp.com',                'SC', '202AYX00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Wisechoice Senior Advisors, LLC',       'wisechoice-senior-advisors',         'chrisanning2@gmail.com',                       'KS', '202LAX00', 'Active',     'sub', 'pending_csr_assignment', true, false, CURRENT_DATE),
  ('Yunicare Medical Solutions',            'yunicare-medical-solutions',         'valenzuelayunier8@gmail.com',                  'AZ', '202KPS00', 'Pending',    'sub', 'pending_csr_assignment', true, false, CURRENT_DATE)
ON CONFLICT (slug) DO NOTHING;

-- Total rows attempted: 96
-- Existing agencies (matched by slug) will be skipped silently.
