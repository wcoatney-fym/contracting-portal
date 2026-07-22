-- Migration: Training Quiz Content
-- Adds 3-5 quiz questions per document-based training module.
-- Quiz format: JSONB array of {question, options[], correct_index}
-- Pass threshold: 80% (handled in frontend)

-- ═══════════════════════════════════════════════════════════════════════
-- 1. UNL — Home Health Care Shield Overview
-- ═══════════════════════════════════════════════════════════════════════
UPDATE agent_training_content
SET has_quiz = true,
    quiz_questions = '[
      {
        "question": "How many Activities of Daily Living (ADLs) must a client be unable to perform to qualify for HHC benefits?",
        "options": ["1 of 6", "2 of 6", "3 of 6", "4 of 6"],
        "correct_index": 1
      },
      {
        "question": "What is the maximum benefit period for the HHC Shield?",
        "options": ["180 days", "270 days", "360 days", "365 days"],
        "correct_index": 2
      },
      {
        "question": "Is prior hospitalization required to receive home health care benefits under this plan?",
        "options": ["Yes, at least 3 days", "Yes, at least 24 hours", "No, prior hospitalization is not required", "Only for Plan C"],
        "correct_index": 2
      },
      {
        "question": "What is the Caregiver Support Benefit (TCARE) lump sum payment amount?",
        "options": ["$1,500", "$2,500", "$3,500", "$5,000"],
        "correct_index": 2
      },
      {
        "question": "How many consecutive days without receiving HHC services are required before benefits restore?",
        "options": ["30 days", "90 days", "180 days", "365 days"],
        "correct_index": 2
      }
    ]'::jsonb
WHERE title = 'Home Health Care Shield Overview';

-- ═══════════════════════════════════════════════════════════════════════
-- 2. UNL — GI Hospital Indemnity Shield Overview
-- ═══════════════════════════════════════════════════════════════════════
UPDATE agent_training_content
SET has_quiz = true,
    quiz_questions = '[
      {
        "question": "What is the standard waiting period for the GI Hospital Indemnity Shield?",
        "options": ["30 days", "60 days", "90 days", "No waiting period"],
        "correct_index": 1
      },
      {
        "question": "How long must a patient be hospitalized to trigger the hospital confinement benefit?",
        "options": ["12 hours", "24 hours", "48 hours", "72 hours"],
        "correct_index": 1
      },
      {
        "question": "Is medical underwriting required for the GI Hospital Indemnity Shield?",
        "options": ["Yes, full underwriting", "Yes, simplified issue", "No, it is guaranteed issue", "Only for ages 75+"],
        "correct_index": 2
      },
      {
        "question": "What is the pre-existing condition limitation period?",
        "options": ["6 months", "12 months", "18 months", "24 months"],
        "correct_index": 1
      },
      {
        "question": "How often do hospital confinement benefits restore?",
        "options": ["Every 6 months", "Every calendar year", "Every 2 years", "They do not restore"],
        "correct_index": 1
      }
    ]'::jsonb
WHERE title = 'GI Hospital Indemnity Shield Overview';

-- ═══════════════════════════════════════════════════════════════════════
-- 3. UNL — State Availability Chart
-- ═══════════════════════════════════════════════════════════════════════
UPDATE agent_training_content
SET has_quiz = true,
    quiz_questions = '[
      {
        "question": "What is the eligible age range for UNL Home Health Care (HHC)?",
        "options": ["18–85", "50–85", "55–85", "60–85"],
        "correct_index": 2
      },
      {
        "question": "How many states is the Hospital Indemnity Shield available in?",
        "options": ["28 states", "30 states", "33 states", "35 states"],
        "correct_index": 3
      },
      {
        "question": "Which UNL product is available in ALL listed states?",
        "options": ["Hospital Indemnity Shield", "Home Health Care Shield", "Final Expense Shield", "Dental Shield 2.0"],
        "correct_index": 2
      },
      {
        "question": "Is the Home Health Care Shield available in Florida?",
        "options": ["Yes", "No", "Only for ages 65+", "Only Plan A"],
        "correct_index": 1
      }
    ]'::jsonb
WHERE title = 'UNL State Availability Chart';

-- ═══════════════════════════════════════════════════════════════════════
-- 4. UNL — Rx Reimbursement — How It Works
-- ═══════════════════════════════════════════════════════════════════════
UPDATE agent_training_content
SET has_quiz = true,
    quiz_questions = '[
      {
        "question": "How are Rx reimbursement claims submitted?",
        "options": ["Through an online portal", "By mailing paper forms", "By emailing a picture of the receipt", "Through the pharmacy directly"],
        "correct_index": 2
      },
      {
        "question": "Who can submit an Rx reimbursement claim?",
        "options": ["Only the client", "Only the agent", "Either the agent or the client", "Only the pharmacy"],
        "correct_index": 2
      },
      {
        "question": "What email address are Rx claims submitted to?",
        "options": ["rx@unlinsurance.com", "claims@unlinsurance.com", "reimbursement@unlinsurance.com", "support@unlinsurance.com"],
        "correct_index": 1
      },
      {
        "question": "Which of the following is NOT a required item on the pharmacy receipt?",
        "options": ["Pharmacy Name", "Drug Names", "Insurance Card Number", "RX Code"],
        "correct_index": 2
      }
    ]'::jsonb
WHERE title = 'Prescription Reimbursement — How It Works';

-- ═══════════════════════════════════════════════════════════════════════
-- 5. UNL — Rx Claims Submission (Reimbursement Examples)
-- ═══════════════════════════════════════════════════════════════════════
UPDATE agent_training_content
SET has_quiz = true,
    quiz_questions = '[
      {
        "question": "What is the reimbursement rate for a generic prescription fill?",
        "options": ["$5 per fill", "$10 per fill", "$15 per fill", "$25 per fill"],
        "correct_index": 1
      },
      {
        "question": "What is the annual reimbursement maximum for Option C?",
        "options": ["$300/year", "$600/year", "$900/year", "$1,200/year"],
        "correct_index": 2
      },
      {
        "question": "In which state is Rx reimbursement NOT available?",
        "options": ["Texas", "Florida", "Kentucky", "Georgia"],
        "correct_index": 2
      },
      {
        "question": "Is reimbursement calculated per fill or per month?",
        "options": ["Per month", "Per fill", "Per quarter", "Per prescription"],
        "correct_index": 1
      },
      {
        "question": "What is the reimbursement rate for a brand-name prescription fill?",
        "options": ["$10 per fill", "$15 per fill", "$20 per fill", "$25 per fill"],
        "correct_index": 3
      }
    ]'::jsonb
WHERE title = 'Prescription Claims Submission';

-- ═══════════════════════════════════════════════════════════════════════
-- 6. General — HHC Master Script
-- ═══════════════════════════════════════════════════════════════════════
UPDATE agent_training_content
SET has_quiz = true,
    quiz_questions = '[
      {
        "question": "What percentage of adults age 65+ will require some form of long-term care?",
        "options": ["40%", "50%", "60%", "70%"],
        "correct_index": 3
      },
      {
        "question": "At most, how many days does Medicare cover for home health care?",
        "options": ["7 days", "14 days", "21 days", "30 days"],
        "correct_index": 2
      },
      {
        "question": "What are the 6 Activities of Daily Living (ADLs)?",
        "options": [
          "Bathing, Continence, Dressing, Eating, Toileting, Transferring",
          "Bathing, Cooking, Dressing, Eating, Walking, Sleeping",
          "Bathing, Cleaning, Driving, Eating, Toileting, Transferring",
          "Bathing, Continence, Dressing, Exercising, Toileting, Transferring"
        ],
        "correct_index": 0
      },
      {
        "question": "Does the HHC Shield require prior hospitalization before benefits begin?",
        "options": ["Yes, 3 days minimum", "Yes, 24 hours minimum", "No, prior hospitalization is not required", "Depends on the state"],
        "correct_index": 2
      }
    ]'::jsonb
WHERE title = 'HHC Master Script';

-- ═══════════════════════════════════════════════════════════════════════
-- 7. General — HHC Master Script — UNL Version
-- ═══════════════════════════════════════════════════════════════════════
UPDATE agent_training_content
SET has_quiz = true,
    quiz_questions = '[
      {
        "question": "How many plan tiers does the UNL HHC Shield offer?",
        "options": ["2 (Plan A, Plan B)", "3 (Plan A, Plan B, Plan C)", "4 (Bronze, Silver, Gold, Platinum)", "1 (Standard)"],
        "correct_index": 1
      },
      {
        "question": "What is the combined daily maximum for Plan C of the HHC Shield?",
        "options": ["$150/day", "$300/day", "$450/day", "$600/day"],
        "correct_index": 2
      },
      {
        "question": "What is the lifetime maximum for the Caregiver Support Benefit (TCARE)?",
        "options": ["One $3,500 payout", "Two $3,500 payouts ($7,000 total)", "Three $3,500 payouts ($10,500 total)", "$5,000 total"],
        "correct_index": 1
      },
      {
        "question": "How much does the Ambulance Benefit Rider pay per ground ambulance trip?",
        "options": ["$100 per trip", "$150 per trip", "$200 per trip", "$250 per trip"],
        "correct_index": 2
      }
    ]'::jsonb
WHERE title = 'HHC Master Script — UNL Version';

-- ═══════════════════════════════════════════════════════════════════════
-- 8. General — EnrollHere Walkthrough
-- ═══════════════════════════════════════════════════════════════════════
UPDATE agent_training_content
SET has_quiz = true,
    quiz_questions = '[
      {
        "question": "What is EnrollHere used for in the FYM workflow?",
        "options": ["Processing commissions", "Dialing leads and clients", "Filing insurance claims", "Managing agent contracts"],
        "correct_index": 1
      },
      {
        "question": "Who provides primary technical support for EnrollHere?",
        "options": ["Charlie", "Will", "Major", "Chris"],
        "correct_index": 2
      },
      {
        "question": "After completing a sale using EnrollHere, what should the agent submit?",
        "options": ["A paper application", "A Sale Submission Form", "An email to UNL", "A Slack message to the team"],
        "correct_index": 1
      }
    ]'::jsonb
WHERE title = 'EnrollHere Walkthrough';

-- ═══════════════════════════════════════════════════════════════════════
-- 9. General — Sale Submission Form
-- ═══════════════════════════════════════════════════════════════════════
UPDATE agent_training_content
SET has_quiz = true,
    quiz_questions = '[
      {
        "question": "When should the Sale Submission Form be completed?",
        "options": ["Before speaking with the client", "After completing a sale", "At the end of each week", "Only for HHC sales"],
        "correct_index": 1
      },
      {
        "question": "Why is the Sale Submission Form important for FYM tracking?",
        "options": ["It triggers commission payments", "It records the sale for production tracking and quality reporting", "It notifies the carrier directly", "It generates the client policy"],
        "correct_index": 1
      },
      {
        "question": "What happens if a Sale Submission Form is not completed?",
        "options": ["The policy is automatically cancelled", "The sale may not be tracked in FYM production reports", "The agent loses their contract", "Nothing — it is optional"],
        "correct_index": 1
      }
    ]'::jsonb
WHERE title = 'Sale Submission Form';
