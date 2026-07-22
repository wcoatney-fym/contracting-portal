-- Add carrier and category columns to agent_training_content
-- Supports multi-carrier training library with grouped display

ALTER TABLE agent_training_content
  ADD COLUMN IF NOT EXISTS carrier text DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'General';

-- Add content_format to distinguish PDFs from videos for UI rendering
ALTER TABLE agent_training_content
  ADD COLUMN IF NOT EXISTS content_format text DEFAULT 'document';

COMMENT ON COLUMN agent_training_content.carrier IS 'Carrier tag: UNL, GTL, AHL, Ameritas, or General';
COMMENT ON COLUMN agent_training_content.category IS 'Display category within carrier: Products & Benefits, Prescription & Claims, etc.';
COMMENT ON COLUMN agent_training_content.content_format IS 'Content format: document, video, audio';

-- Seed all 22 training content items from Charlie''s Google Drive
-- Google Drive download URL pattern: https://drive.google.com/file/d/{ID}/view
-- For direct open/preview: https://drive.google.com/file/d/{ID}/view

-- ═══════════════════════════════════════════════════════════════
-- UNL — Products & Benefits (4 items)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO agent_training_content (title, description, content_type, content_format, content_url, carrier, category, display_order, is_active, has_quiz, quiz_questions)
VALUES
  ('Home Health Care Shield Overview',
   'Full product breakdown: 3 plan tiers ($50K/$100K/$150K), daily benefits, ADL qualification triggers, TCARE caregiver support, and optional riders.',
   'document', 'document',
   'https://drive.google.com/file/d/1zNqLR8TVd7JKLTYO05zzRvrIskF5hMB7/view',
   'UNL', 'Products & Benefits', 1, true, false, '[]'::jsonb),

  ('GI Hospital Indemnity Shield Overview',
   'Guaranteed issue hospital confinement coverage: $100–$450/day benefit, ambulance and outpatient surgery riders, sample premium calculations.',
   'document', 'document',
   'https://drive.google.com/file/d/10wJlnJFF9gto_QtHq0B_uuMSGdCnF4CY/view',
   'UNL', 'Products & Benefits', 2, true, false, '[]'::jsonb),

  ('UNL State Availability Chart',
   'Quick-reference grid showing which UNL products (HI, HHC, Dental, Cancer, Final Expense) are approved in each state.',
   'document', 'document',
   'https://drive.google.com/file/d/1NjPAudbYAs9B8FAn67NDR0emfnS0No8e/view',
   'UNL', 'Products & Benefits', 3, true, false, '[]'::jsonb),

  ('UNL Build Chart',
   'Commission and production build chart for UNL products.',
   'document', 'document',
   'https://drive.google.com/file/d/1IkNIxfbAgUNDJzU4Tjg9Ct8wNKi8vHlj/view',
   'UNL', 'Products & Benefits', 4, true, false, '[]'::jsonb);

-- ═══════════════════════════════════════════════════════════════
-- UNL — Prescription & Claims (2 items)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO agent_training_content (title, description, content_type, content_format, content_url, carrier, category, display_order, is_active, has_quiz, quiz_questions)
VALUES
  ('Prescription Reimbursement — How It Works',
   'Per-fill reimbursement rates ($10 generic / $25 brand), annual caps by plan tier, and worked examples showing how fill frequency changes the math.',
   'document', 'document',
   'https://drive.google.com/file/d/1EDL4IjpXLzkLHi7ZiZsjPXrP2G3O72xS/view',
   'UNL', 'Prescription & Claims', 5, true, false, '[]'::jsonb),

  ('Prescription Claims Submission',
   'One-pager: email a receipt photo to claims@unlinsurance.com with pharmacy name, drug names, insured name, date, and RX code.',
   'document', 'document',
   'https://drive.google.com/file/d/12toMBbVoT42fMv8sfP6dOZ5QCc0wE4L6/view',
   'UNL', 'Prescription & Claims', 6, true, false, '[]'::jsonb);

-- ═══════════════════════════════════════════════════════════════
-- UNL — Applications (2 items)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO agent_training_content (title, description, content_type, content_format, content_url, carrier, category, display_order, is_active, has_quiz, quiz_questions)
VALUES
  ('Home Health Care Application',
   'Blank UNL Home Health Care Shield application form — download and use with clients.',
   'document', 'document',
   'https://drive.google.com/file/d/1457KOTGmABTtr7GLopnGLKmB2fefrLW0/view',
   'UNL', 'Applications & Forms', 7, true, false, '[]'::jsonb),

  ('Hospital Indemnity Application',
   'Blank UNL GI Hospital Indemnity Shield application form — download and use with clients.',
   'document', 'document',
   'https://drive.google.com/file/d/1nexJkK1CELHSehYaL_m_pLc_0nvzipYo/view',
   'UNL', 'Applications & Forms', 8, true, false, '[]'::jsonb);

-- ═══════════════════════════════════════════════════════════════
-- UNL — Training Videos (3 items)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO agent_training_content (title, description, content_type, content_format, content_url, carrier, category, display_order, is_active, has_quiz, quiz_questions)
VALUES
  ('How to Download Forms in UNL',
   'Quick video walkthrough showing how to find and download forms from the UNL agent portal.',
   'video', 'video',
   'https://drive.google.com/file/d/1hdReqD5C18tO9jKHU-43JX6tLIe5-QKC/view',
   'UNL', 'Training Videos', 9, true, false, '[]'::jsonb),

  ('Ancillary Training — Medicare Advantage Client Walkthrough',
   'Full UNL + EnrollHere walkthrough with a Medicare Advantage example client. Covers the complete sales and enrollment process.',
   'video', 'video',
   'https://drive.google.com/file/d/13_WA4U_7O1bA-8R-Zg2zewKmWcKE1b7D/view',
   'UNL', 'Training Videos', 10, true, false, '[]'::jsonb),

  ('Ancillary Training — Medicare Supplement Client Walkthrough',
   'Full UNL + EnrollHere walkthrough with a Medicare Supplement example client. Covers the complete sales and enrollment process.',
   'video', 'video',
   'https://drive.google.com/file/d/1toLooJWqYXNR8vb6sY1GMJQyldmkDov7/view',
   'UNL', 'Training Videos', 11, true, false, '[]'::jsonb);

-- ═══════════════════════════════════════════════════════════════
-- GTL (2 items)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO agent_training_content (title, description, content_type, content_format, content_url, carrier, category, display_order, is_active, has_quiz, quiz_questions)
VALUES
  ('GTL State Availability Chart',
   'Quick-reference grid showing which states GTL Hospital Indemnity products are approved in.',
   'document', 'document',
   'https://drive.google.com/file/d/14_mpXg7GNySriCtYDzN8fo9IIZYO1hbX/view',
   'GTL', 'Products & Benefits', 12, true, false, '[]'::jsonb),

  ('GTL HI Training — Greg Esposito',
   'Full GTL Hospital Indemnity product training recording with Greg Esposito. Covers product details, sales approach, and enrollment process.',
   'video', 'video',
   'https://drive.google.com/file/d/17DZ8fXRdMM-zMeVYij_iahihTCc1_NtE/view',
   'GTL', 'Training Videos', 13, true, false, '[]'::jsonb);

-- ═══════════════════════════════════════════════════════════════
-- American Home Life / AHL (3 items)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO agent_training_content (title, description, content_type, content_format, content_url, carrier, category, display_order, is_active, has_quiz, quiz_questions)
VALUES
  ('AHL Hospital Indemnity Overview',
   'American Home Life Hospital Indemnity product brochure — coverage details, benefit tiers, and plan options.',
   'document', 'document',
   'https://drive.google.com/file/d/1z69bMY5EwRJKTZzzkJUMXNXR0LPKp283/view',
   'AHL', 'Products & Benefits', 14, true, false, '[]'::jsonb),

  ('AHL Ideal Flex Series — State Availability',
   'State availability chart for American Home Life''s Ideal Flex Series products.',
   'document', 'document',
   'https://drive.google.com/file/d/1WPMuWSMuWKLb0xWCIx_qrNuX00F_3ILq/view',
   'AHL', 'Products & Benefits', 15, true, false, '[]'::jsonb),

  ('AHL HI Training — Tye Weaver (Heartland)',
   'Full American Home Life Hospital Indemnity training recording with Tye Weaver from Heartland. Product deep-dive and sales strategies.',
   'video', 'video',
   'https://drive.google.com/file/d/1i1kLLPG7PjXiTsLygK1ia5_EMS0_KKTf/view',
   'AHL', 'Training Videos', 16, true, false, '[]'::jsonb);

-- ═══════════════════════════════════════════════════════════════
-- Ameritas (1 item)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO agent_training_content (title, description, content_type, content_format, content_url, carrier, category, display_order, is_active, has_quiz, quiz_questions)
VALUES
  ('Ameritas Product Training',
   'Full Ameritas product training recording covering dental and vision product lines.',
   'video', 'video',
   'https://drive.google.com/file/d/1kIxeMHJUjjISTEeMFxbQZEb8n_FekEr7/view',
   'Ameritas', 'Training Videos', 17, true, false, '[]'::jsonb);

-- ═══════════════════════════════════════════════════════════════
-- Scripts, Links & More — General (5 items)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO agent_training_content (title, description, content_type, content_format, content_url, carrier, category, display_order, is_active, has_quiz, quiz_questions)
VALUES
  ('HHC Master Script',
   'The master sales script for Home Health Care — use this as your primary talk track.',
   'document', 'document',
   'https://drive.google.com/file/d/1DHJqDagkVNrOylmJhqBflsgBNG8gTa1g/view',
   'General', 'Scripts & Sales Process', 18, true, false, '[]'::jsonb),

  ('HHC Master Script — UNL Version',
   'UNL-specific version of the HHC master sales script with carrier-specific details.',
   'document', 'document',
   'https://drive.google.com/file/d/1ppLyi-Mfm4aviFlN2x3rAsZWFvmQ9_V9/view',
   'General', 'Scripts & Sales Process', 19, true, false, '[]'::jsonb),

  ('Manhattan HHC Master Script',
   'Manhattan-specific version of the HHC master sales script.',
   'document', 'document',
   'https://drive.google.com/file/d/1UiEHplTZtmfMif2SicFaxyPjGMgiGF07/view',
   'General', 'Scripts & Sales Process', 20, true, false, '[]'::jsonb),

  ('EnrollHere Walkthrough',
   'Step-by-step guide for using the EnrollHere dialer platform — setup, navigation, and best practices.',
   'document', 'document',
   'https://drive.google.com/file/d/1dXYJIQemKNDCXYoduiLeIoyXtXgSz5Zm/view',
   'General', 'Tools & How-To', 21, true, false, '[]'::jsonb),

  ('Sale Submission Form',
   'Blank sale submission form — use to submit completed sales for processing.',
   'document', 'document',
   'https://drive.google.com/file/d/1MhnX19iOTCWuiRkTbNt1t6ZkWiKA-Y8a/view',
   'General', 'Applications & Forms', 22, true, false, '[]'::jsonb);
