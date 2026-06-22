/*
  # Seed Cross-Sell Defaults with Actual Product Content

  1. New Fields Added
    - `subheadline` for all 5 products
    - `qualification_age_requirement` for Product 5
    - `qualification_doctor_participation` for Product 5
    - `qualification_enrollment_fee` for Product 5
    - `qualification_income_guidelines` for Product 5

  2. Changes
    - Updates all existing field_value entries in cross_sell_defaults from empty to actual content
    - Inserts new field rows (subheadline for all products, qualification fields for Product 5)
    - Uses ON CONFLICT to upsert safely

  3. Notes
    - Only affects new agencies going forward (existing agencies are not backfilled)
    - Specialist fields remain empty as they are populated per-agency from CSR info
    - Funnel links and System CRM # use placeholder values that agencies customize
*/

INSERT INTO cross_sell_defaults (product_number, product_name, field_key, field_value) VALUES
  -- Product 1: Final Expense Life Insurance
  (1, 'Final Expense Life Insurance', 'headline', 'Affordable Final Expense Coverage – Peace of Mind for Your Family'),
  (1, 'Final Expense Life Insurance', 'subheadline', 'If you want peace of mind and simple coverage options, we''ll help you compare plans that fit your budget.'),
  (1, 'Final Expense Life Insurance', 'meta_title', 'Final Expense Life Insurance – Affordable Protection | {{custom_values.business__name}}'),
  (1, 'Final Expense Life Insurance', 'meta_description', 'Lock in affordable Final Expense coverage to protect your loved ones from funeral and final expenses. Simple enrollment, guaranteed acceptance for many seniors.'),
  (1, 'Final Expense Life Insurance', 'meta_image_url', 'https://storage.googleapis.com/msgsndr/YM9XmCanfO6p28b1sQOH/media/687c6dcbe36c15608b1a9d49.png'),
  (1, 'Final Expense Life Insurance', 'cta_text', 'Schedule Your Free Final Expense Review'),
  (1, 'Final Expense Life Insurance', 'button_cta_text', 'Learn More...'),
  (1, 'Final Expense Life Insurance', 'bullet_1', 'Affordable, Guaranteed Coverage'),
  (1, 'Final Expense Life Insurance', 'bullet_1_description', 'Plans designed to fit any budget, with guaranteed acceptance for many seniors — no medical exams required.'),
  (1, 'Final Expense Life Insurance', 'bullet_2', 'Covers Funeral & Final Expenses'),
  (1, 'Final Expense Life Insurance', 'bullet_2_description', 'Provides cash to cover funeral costs, medical bills, and any remaining debts so your family isn''t burdened.'),
  (1, 'Final Expense Life Insurance', 'bullet_3', 'Rates That Never Increase'),
  (1, 'Final Expense Life Insurance', 'bullet_3_description', 'Your monthly premium is locked in for life — no surprises or rate hikes as you get older.'),
  (1, 'Final Expense Life Insurance', 'bullet_4', 'Fast Payouts to Your Beneficiaries'),
  (1, 'Final Expense Life Insurance', 'bullet_4_description', 'Funds are paid directly to your loved ones, usually within days, to handle urgent expenses.'),
  (1, 'Final Expense Life Insurance', 'bullet_5', 'Simple Enrollment, No Hassle'),
  (1, 'Final Expense Life Insurance', 'bullet_5_description', 'Quick application process, no medical exams, and immediate approval in most cases.'),
  (1, 'Final Expense Life Insurance', 'calendar_embed_code', '<iframe src="https://api.leadconnectorhq.com/widget/booking/93drSh08PnNLxFsN2CpA" style="width: 100%;border:none;overflow: hidden;" scrolling="no" id="93drSh08PnNLxFsN2CpA_1771873192484"></iframe><br><script src="https://link.msgsndr.com/js/form_embed.js" type="text/javascript"></script>'),
  (1, 'Final Expense Life Insurance', 'appointment_disclaimer', 'Your licensed specialist will help you compare plans and lock in coverage that fits your needs and budget.'),
  (1, 'Final Expense Life Insurance', 'confirmation_headline', 'You''re Booked — Your Final Expense Review Is Confirmed'),
  (1, 'Final Expense Life Insurance', 'confirmation_subheadline', 'One of our licensed specialists will call you at your scheduled time to review your coverage options and answer any questions.'),
  (1, 'Final Expense Life Insurance', 'confirmation_next_steps', '• Check your email for your appointment details and a reminder link. • Have your current insurance or Medicare plan handy so we can review your needs. • Make a list of questions—we''re here to help you protect your family.'),
  (1, 'Final Expense Life Insurance', 'funnel_link_step_1', 'STEP_1_URL_HERE'),
  (1, 'Final Expense Life Insurance', 'funnel_link_step_2', 'STEP_2_URL_HERE'),
  (1, 'Final Expense Life Insurance', 'system_crm_number', 'SYSTEM_CRM_NUMBER_HERE'),

  -- Product 2: Hospital Indemnity
  (2, 'Hospital Indemnity', 'headline', 'Erase Your Copays & Deductibles – Protect Your Wallet with Hospital Indemnity Coverage'),
  (2, 'Hospital Indemnity', 'subheadline', 'If you''re on Medicare Advantage or a Supplement plan with deductibles or copays, our Hospital Indemnity Plan helps cover those surprise out-of-pocket costs, so you can focus on getting care — not the bills.'),
  (2, 'Hospital Indemnity', 'meta_title', 'Hospital Indemnity Coverage – Erase Copays & Deductibles | {{custom_values.business__name}}'),
  (2, 'Hospital Indemnity', 'meta_description', 'Discover how Hospital Indemnity Plan can eliminate out-of-pocket costs for Medicare Advantage or Supplement plans. Fast approval, affordable protection.'),
  (2, 'Hospital Indemnity', 'meta_image_url', 'https://storage.googleapis.com/msgsndr/YM9XmCanfO6p28b1sQOH/media/687cdef6ddc9c183e25730e0.png'),
  (2, 'Hospital Indemnity', 'cta_text', 'Schedule Your Free Copay & Deductible Eraser Review'),
  (2, 'Hospital Indemnity', 'button_cta_text', 'Learn More...'),
  (2, 'Hospital Indemnity', 'bullet_1', 'Erase Out-of-Pocket Costs'),
  (2, 'Hospital Indemnity', 'bullet_1_description', 'Covers hospital stays, ER visits, and Part B copays so you''re not left paying hundreds or thousands unexpectedly.'),
  (2, 'Hospital Indemnity', 'bullet_2', 'Affordable Monthly Protection'),
  (2, 'Hospital Indemnity', 'bullet_2_description', 'Low-cost coverage designed to fit any budget, often under $1 a day.'),
  (2, 'Hospital Indemnity', 'bullet_3', 'Works with Medicare Advantage & Supplements'),
  (2, 'Hospital Indemnity', 'bullet_3_description', 'Pairs seamlessly with most plans to fill the gaps for deductibles and copays.'),
  (2, 'Hospital Indemnity', 'bullet_4', 'Cash Benefits Paid Directly to You'),
  (2, 'Hospital Indemnity', 'bullet_4_description', 'Get paid directly so you can use the funds for medical bills or any expense you choose.'),
  (2, 'Hospital Indemnity', 'bullet_5', 'Fast, Simple Enrollment'),
  (2, 'Hospital Indemnity', 'bullet_5_description', 'Quick approval process with no medical exams, so your protection starts right away.'),
  (2, 'Hospital Indemnity', 'calendar_embed_code', '<iframe src="https://api.leadconnectorhq.com/widget/booking/93drSh08PnNLxFsN2CpA" style="width: 100%;border:none;overflow: hidden;" scrolling="no" id="93drSh08PnNLxFsN2CpA_1771873192484"></iframe><br><script src="https://link.msgsndr.com/js/form_embed.js" type="text/javascript"></script>'),
  (2, 'Hospital Indemnity', 'appointment_disclaimer', 'Your licensed specialist will review your plan and help you see how Hospital Indemnity can fill your coverage gaps.'),
  (2, 'Hospital Indemnity', 'confirmation_headline', 'You''re Booked — Your Copay & Deductible Eraser Plan Review is Confirmed!'),
  (2, 'Hospital Indemnity', 'confirmation_subheadline', 'One of our licensed specialists will call you at your scheduled time to walk through how Hospital Indemnity can protect your budget and erase those costs.'),
  (2, 'Hospital Indemnity', 'confirmation_next_steps', '• Check your email for your appointment details and a reminder link. • Have your current Medicare plan handy so we can review your copay and deductible exposure. • Prepare your questions — our job is to make sure you''re fully protected.'),
  (2, 'Hospital Indemnity', 'funnel_link_step_1', 'STEP_1_URL_HERE'),
  (2, 'Hospital Indemnity', 'funnel_link_step_2', 'STEP_2_URL_HERE'),
  (2, 'Hospital Indemnity', 'system_crm_number', 'SYSTEM_CRM_NUMBER_HERE'),

  -- Product 3: Cancer/Stroke Coverage
  (3, 'Cancer/Stroke Coverage', 'headline', 'Lump-Sum Protection for Cancer & Stroke – Financial Relief When You Need It Most'),
  (3, 'Cancer/Stroke Coverage', 'subheadline', 'Cancer or a major stroke can create massive medical bills and unexpected costs. This plan pays you cash directly, so you can focus on recovery, not finances.'),
  (3, 'Cancer/Stroke Coverage', 'meta_title', 'Cancer & Stroke Insurance – Lump-Sum Cash Benefits | {{custom_values.business__name}}'),
  (3, 'Cancer/Stroke Coverage', 'meta_description', 'Get affordable Cancer & Stroke coverage that pays cash directly to you for treatment, travel, or any expense. Works alongside Medicare with no medical exams.'),
  (3, 'Cancer/Stroke Coverage', 'meta_image_url', 'https://storage.googleapis.com/msgsndr/YM9XmCanfO6p28b1sQOH/media/687ce01554a1884c15546694.png'),
  (3, 'Cancer/Stroke Coverage', 'cta_text', 'Schedule Your Free Coverage Review'),
  (3, 'Cancer/Stroke Coverage', 'button_cta_text', 'Learn More...'),
  (3, 'Cancer/Stroke Coverage', 'bullet_1', 'Cash Paid Directly to You'),
  (3, 'Cancer/Stroke Coverage', 'bullet_1_description', 'Receive a lump-sum payment you can use for treatment, travel, lost income, or any expense — no restrictions.'),
  (3, 'Cancer/Stroke Coverage', 'bullet_2', 'Covers Cancer, Stroke, and Heart Events'),
  (3, 'Cancer/Stroke Coverage', 'bullet_2_description', 'Protection for the most common and costly health events that Medicare doesn''t fully cover.'),
  (3, 'Cancer/Stroke Coverage', 'bullet_3', 'Affordable Coverage Options'),
  (3, 'Cancer/Stroke Coverage', 'bullet_3_description', 'Plans designed to fit any budget, with benefits up to tens of thousands of dollars.'),
  (3, 'Cancer/Stroke Coverage', 'bullet_4', 'Works with Medicare & Other Insurance'),
  (3, 'Cancer/Stroke Coverage', 'bullet_4_description', 'Pays in addition to your Medicare or supplemental coverage — no conflicts or offsets.'),
  (3, 'Cancer/Stroke Coverage', 'bullet_5', 'Fast Approval, No Exams'),
  (3, 'Cancer/Stroke Coverage', 'bullet_5_description', 'Quick, simple application with no medical exams or long wait times.'),
  (3, 'Cancer/Stroke Coverage', 'calendar_embed_code', '<iframe src="https://api.leadconnectorhq.com/widget/booking/93drSh08PnNLxFsN2CpA" style="width: 100%;border:none;overflow: hidden;" scrolling="no" id="93drSh08PnNLxFsN2CpA_1771873192484"></iframe><br><script src="https://link.msgsndr.com/js/form_embed.js" type="text/javascript"></script>'),
  (3, 'Cancer/Stroke Coverage', 'appointment_disclaimer', 'Your licensed specialist will show you how this coverage can provide financial relief during major health events.'),
  (3, 'Cancer/Stroke Coverage', 'confirmation_headline', 'You''re Booked — Your Cancer & Stroke Coverage Review is Confirmed!'),
  (3, 'Cancer/Stroke Coverage', 'confirmation_subheadline', 'One of our licensed specialists will call you at your scheduled time to go over benefit options and answer your questions.'),
  (3, 'Cancer/Stroke Coverage', 'confirmation_next_steps', '• Check your email for your appointment details and a reminder link. • Have your current Medicare or supplemental plan handy so we can identify your coverage gaps. • Bring any questions about costs, benefits, or how the policy works — we''ll make sure you''re informed.'),
  (3, 'Cancer/Stroke Coverage', 'funnel_link_step_1', 'STEP_1_URL_HERE'),
  (3, 'Cancer/Stroke Coverage', 'funnel_link_step_2', 'STEP_2_URL_HERE'),
  (3, 'Cancer/Stroke Coverage', 'system_crm_number', 'SYSTEM_CRM_NUMBER_HERE'),

  -- Product 4: LTC/STC
  (4, 'LTC/STC', 'headline', 'Protect Your Savings from Care Costs – Short & Long-Term Care Coverage'),
  (4, 'LTC/STC', 'subheadline', 'Home care, rehab, or nursing facilities can drain your savings. Our care coverage plans give you affordable protection so you can get the care you need without financial stress.'),
  (4, 'LTC/STC', 'meta_title', 'Short & Long-Term Care Coverage – Protect Your Savings | {{custom_values.business__name}}'),
  (4, 'LTC/STC', 'meta_description', 'Cover home health, rehab, and nursing facility costs with affordable care coverage. Protect your savings and get care without financial stress.'),
  (4, 'LTC/STC', 'meta_image_url', 'https://storage.googleapis.com/msgsndr/YM9XmCanfO6p28b1sQOH/media/687c733ec96ebbe9a4516281.png'),
  (4, 'LTC/STC', 'cta_text', 'Schedule Your Free Care Coverage Review'),
  (4, 'LTC/STC', 'button_cta_text', 'Learn More...'),
  (4, 'LTC/STC', 'bullet_1', 'Affordable Care Protection'),
  (4, 'LTC/STC', 'bullet_1_description', 'Low-cost plans designed to help cover the cost of home health care, rehab, and assisted living facilities.'),
  (4, 'LTC/STC', 'bullet_2', 'Pays Cash for Care Services'),
  (4, 'LTC/STC', 'bullet_2_description', 'Receive daily or monthly cash benefits you can use to pay for qualified care expenses.'),
  (4, 'LTC/STC', 'bullet_3', 'Options for Short & Long-Term Needs'),
  (4, 'LTC/STC', 'bullet_3_description', 'Plans available to cover temporary recovery care or ongoing long-term care situations.'),
  (4, 'LTC/STC', 'bullet_4', 'Helps Protect Your Retirement Savings'),
  (4, 'LTC/STC', 'bullet_4_description', 'Prevents high medical or facility bills from draining the assets you''ve worked hard to save.'),
  (4, 'LTC/STC', 'bullet_5', 'Simple Enrollment, Fast Approval'),
  (4, 'LTC/STC', 'bullet_5_description', 'Quick application process with no lengthy medical exams and flexible eligibility options.'),
  (4, 'LTC/STC', 'calendar_embed_code', '<iframe src="https://api.leadconnectorhq.com/widget/booking/93drSh08PnNLxFsN2CpA" style="width: 100%;border:none;overflow: hidden;" scrolling="no" id="93drSh08PnNLxFsN2CpA_1771873192484"></iframe><br><script src="https://link.msgsndr.com/js/form_embed.js" type="text/javascript"></script>'),
  (4, 'LTC/STC', 'appointment_disclaimer', 'Your licensed specialist will help you explore affordable plans to protect your savings and cover care costs.'),
  (4, 'LTC/STC', 'confirmation_headline', 'You''re Booked — Your Care Coverage Review is Confirmed!'),
  (4, 'LTC/STC', 'confirmation_subheadline', 'One of our licensed specialists will call you at your scheduled time to review plan options and answer your questions.'),
  (4, 'LTC/STC', 'confirmation_next_steps', '• Check your email for your appointment details and reminder link. • Have your current insurance or Medicare plan handy so we can identify any gaps. • Prepare your questions about care coverage, benefits, and costs — we''ll make sure you''re informed.'),
  (4, 'LTC/STC', 'funnel_link_step_1', 'STEP_1_URL_HERE'),
  (4, 'LTC/STC', 'funnel_link_step_2', 'STEP_2_URL_HERE'),
  (4, 'LTC/STC', 'system_crm_number', 'SYSTEM_CRM_NUMBER_HERE'),

  -- Product 5: SmartSaveMeds
  (5, 'SmartSaveMeds', 'headline', 'Slash Your Brand-Name Prescription Costs – Up to 80% Savings'),
  (5, 'SmartSaveMeds', 'subheadline', ''),
  (5, 'SmartSaveMeds', 'meta_title', 'Prescription Savings Program – Save Up to 80% on Brand-Name Prescriptions | {{custom_values.business__name}}'),
  (5, 'SmartSaveMeds', 'meta_description', 'Slash your prescription drug costs with program help. Save up to 80% on brand-name meds with fast approval and full support.'),
  (5, 'SmartSaveMeds', 'meta_image_url', 'https://storage.googleapis.com/msgsndr/YM9XmCanfO6p28b1sQOH/media/687ce0eb4d6fb76ae9b7c365.png'),
  (5, 'SmartSaveMeds', 'cta_text', 'Schedule Your Consultation'),
  (5, 'SmartSaveMeds', 'button_cta_text', 'Learn More...'),
  (5, 'SmartSaveMeds', 'bullet_1', 'Up to 80% Off Brand-Name Medications'),
  (5, 'SmartSaveMeds', 'bullet_1_description', 'Our patient assistance program helps you afford expensive prescriptions, often saving thousands per year.'),
  (5, 'SmartSaveMeds', 'bullet_2', 'Easy Enrollment, Fast Approval'),
  (5, 'SmartSaveMeds', 'bullet_2_description', 'Most clients are approved in 7–10 days with minimal paperwork.'),
  (5, 'SmartSaveMeds', 'bullet_3', 'Works With or Without Medicare Part D'),
  (5, 'SmartSaveMeds', 'bullet_3_description', 'Savings available whether or not you currently have prescription drug coverage.'),
  (5, 'SmartSaveMeds', 'bullet_4', 'Keeps Your Doctor and Pharmacy'),
  (5, 'SmartSaveMeds', 'bullet_4_description', 'No need to change your doctor or pharmacy — discounts are applied automatically once approved.'),
  (5, 'SmartSaveMeds', 'bullet_5', 'Ongoing Support & Renewal Help'),
  (5, 'SmartSaveMeds', 'bullet_5_description', 'Your specialist will help with yearly renewals and ensure you continue to receive your medications affordably.'),
  (5, 'SmartSaveMeds', 'calendar_embed_code', '<iframe src="https://api.leadconnectorhq.com/widget/booking/93drSh08PnNLxFsN2CpA" style="width: 100%;border:none;overflow: hidden;" scrolling="no" id="93drSh08PnNLxFsN2CpA_1771873192484"></iframe><br><script src="https://link.msgsndr.com/js/form_embed.js" type="text/javascript"></script>'),
  (5, 'SmartSaveMeds', 'appointment_disclaimer', 'Your licensed specialist will review your medications, verify your eligibility, and help you lock in your brand-name savings.'),
  (5, 'SmartSaveMeds', 'confirmation_headline', 'You''re Booked — Your Consultation is Confirmed!'),
  (5, 'SmartSaveMeds', 'confirmation_subheadline', 'One of our licensed specialists will call you at your scheduled time to walk through your medications, verify your code, and confirm your savings.'),
  (5, 'SmartSaveMeds', 'confirmation_next_steps', '• Check your email for your appointment details and a reminder link. • Have your medication list and any program code ready. • Bring any questions about program costs, eligibility, and renewals — we''ll make sure you''re covered.'),
  (5, 'SmartSaveMeds', 'funnel_link_step_1', 'STEP_1_URL_HERE'),
  (5, 'SmartSaveMeds', 'funnel_link_step_2', 'STEP_2_URL_HERE'),
  (5, 'SmartSaveMeds', 'system_crm_number', 'SYSTEM_CRM_NUMBER_HERE'),
  (5, 'SmartSaveMeds', 'qualification_age_requirement', 'Must be 18 or older (most clients are Medicare-eligible seniors).'),
  (5, 'SmartSaveMeds', 'qualification_doctor_participation', 'Doctor must be willing to submit the prescription and complete any manufacturer-required forms.'),
  (5, 'SmartSaveMeds', 'qualification_enrollment_fee', 'One-time or monthly program fee may apply, depending on medication and manufacturer requirements.'),
  (5, 'SmartSaveMeds', 'qualification_income_guidelines', 'Household income must generally be at or below 300% of the Federal Poverty Level (special exceptions may apply).')
ON CONFLICT (product_number, field_key) DO UPDATE SET
  field_value = EXCLUDED.field_value,
  product_name = EXCLUDED.product_name,
  updated_at = now();