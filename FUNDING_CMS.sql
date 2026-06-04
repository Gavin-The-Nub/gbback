-- FUNDING & ACCESS OVERVIEW CMS SETUP SCRIPT

-- 1. Create public.funding_access_sections table
CREATE TABLE IF NOT EXISTS public.funding_access_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  tag TEXT NOT NULL,
  icon TEXT NOT NULL,
  description TEXT NOT NULL,
  details JSONB NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.funding_access_sections ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies for public.funding_access_sections
DROP POLICY IF EXISTS "Allow public read access for funding_access_sections" ON public.funding_access_sections;
CREATE POLICY "Allow public read access for funding_access_sections"
ON public.funding_access_sections FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Allow admin to manage funding_access_sections" ON public.funding_access_sections;
CREATE POLICY "Allow admin to manage funding_access_sections"
ON public.funding_access_sections FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 4. Seed database with standard values
INSERT INTO public.funding_access_sections (key, title, tag, icon, description, details, sort_order)
VALUES
  (
    'subsidized',
    'Subsidized Programs (Cost-Shared Support)',
    'Shared Funding Model',
    'CircleDollarSign',
    'Schools and GBFF share program costs to expand access while reducing per-student expenses. Programs are delivered through the Support One, Empower Two™ vetted provider network, ensuring consistent instructional quality and standardized delivery.',
    '{
      "left_col_title": "Provider Participation Model",
      "left_col_text": "Approved providers operate under a structured service agreement where they:",
      "left_col_bullets": [
        "Deliver consistent academic support services",
        "Align with school academic priorities and program requirements",
        "Participate in scalable, cost-efficient service delivery models",
        "Support workforce development pathways for educators and tutors",
        "Expand access for high-need student populations"
      ],
      "left_col_style": "default",
      "right_col_title": "Benefits",
      "right_col_bullets": [
        "Lower per-student cost",
        "Increased student participation",
        "Flexible school budget usage",
        "Expanded academic support capacity"
      ],
      "right_col_style": "default"
    }',
    10
  ),
  (
    'sponsored',
    'Sponsored / Fully Funded Access',
    'Grant & Philanthropic Support',
    'Handshake',
    'Programs may be fully or partially funded through grants, corporate sponsors, or philanthropic partners. GBFF manages funding coordination, compliance, provider assignment, and service delivery oversight.',
    '{
      "left_col_title": "Provider Role",
      "left_col_text": "Approved providers deliver services under funded allocations with standardized instructional expectations and reporting requirements.",
      "left_col_bullets": [],
      "left_col_style": "default",
      "right_col_title": "Benefits",
      "right_col_bullets": [
        "No-cost access when funding is available",
        "Increased equity for high-need schools",
        "Expanded program reach",
        "Reduced financial barriers"
      ],
      "right_col_style": "default"
    }',
    20
  ),
  (
    'school-funded',
    'School-Funded Access',
    'Direct Budget Allocation',
    'School',
    'Schools may use existing academic support budgets (Title I, intervention, enrichment, tutoring, or related allocations) to access structured services.',
    '{
      "left_col_title": "Flexible Vendor Alignment",
      "left_col_text": "Where schools already have existing tutoring or education vendors, GBFF supports integration by:",
      "left_col_bullets": [
        "Structuring funding within approved academic service categories",
        "Aligning service delivery to standardized program requirements",
        "Allowing school-selected vendors to participate if they meet program standards",
        "Providing optional access to GBFF vetted providers for expanded capacity",
        "Ensuring consistent reporting and accountability across all providers"
      ],
      "left_col_style": "indigo-box",
      "right_col_title": "What This Ensures",
      "right_col_bullets": [
        "Schools retain full control of vendor relationships",
        "Existing vendor contracts remain valid if aligned",
        "No disruption to current school systems",
        "Optional expansion through GBFF provider network"
      ],
      "right_col_style": "emerald-pills"
    }',
    30
  ),
  (
    'voucher',
    'Education Service Credit & Voucher Model',
    'Standardized Instructional Units',
    'CreditCard',
    'Academic services are delivered through standardized Service Credits, which represent defined instructional units (e.g., tutoring sessions, intervention blocks, enrichment modules).',
    '{
      "left_col_title": "Vendor & Voucher Usage Rules",
      "left_col_text": "Service Credits / Vouchers may be used ONLY with:",
      "left_col_bullets": [
        "GBFF vetted education providers",
        "School-approved vendors aligned with program standards"
      ],
      "left_col_style": "default",
      "left_col_extra_box_title": "Safeguards",
      "left_col_extra_box_bullets": [
        "Not cash or financial instruments",
        "Not transferable outside program systems",
        "Used only for approved educational services",
        "Fully tracked, documented, and reportable"
      ],
      "left_col_extra_box_style": "red-box",
      "right_col_title": "Payment Structure",
      "right_col_bullets": [
        "Services are delivered first",
        "Services are documented and verified",
        "Payments are issued only after validation",
        "Rates are pre-approved under program agreements"
      ],
      "right_col_bullets_numbered": true,
      "right_col_style": "indigo-box",
      "right_col_extra_title": "What This Solves",
      "right_col_extra_bullets": [
        "Prevents pricing disputes",
        "Ensures accountability for services delivered",
        "Aligns with grant and district audit expectations",
        "Provides clear cost control and transparency"
      ]
    }',
    40
  ),
  (
    'vetted-network',
    'Vetted Education Provider Network',
    'Quality & Compliance Standards',
    'Users',
    'Global Bright Futures Foundation operates a Support One, Empower Two™ vetted provider network including qualified tutors, educators, and academic support professionals.',
    '{
      "left_col_title": "Provider Oversight Standards",
      "left_col_bullets": [
        "Instructional quality and alignment requirements",
        "Compliance and service delivery expectations",
        "Standardized reporting and accountability systems",
        "Alignment with school academic goals and outcomes"
      ],
      "left_col_bullets_styled": true,
      "left_col_style": "default",
      "description_extra": "All providers—whether GBFF-approved or school-aligned—operate under structured standards.",
      "right_col_extra_box_title": "Key Clarification",
      "right_col_extra_box_text": "GBFF functions as a program administration and funding coordination entity, ensuring consistency, compliance, and quality across all service delivery pathways.",
      "right_col_extra_box_style": "dashed-box"
    }',
    50
  ),
  (
    'priority',
    'Priority Access Allocation',
    'Need-Based Support Distribution',
    'BarChart3',
    'When demand exceeds capacity, access is allocated based on student academic need, school resource level, funding type, and provider availability.',
    '{
      "left_col_title": "Provider Flexibility",
      "left_col_text": "Assignments may include:",
      "left_col_custom_cards": [
        {"title": "GBFF vetted providers", "icon": "Users"},
        {"title": "School-approved vendors (if aligned)", "icon": "School"}
      ],
      "left_col_style": "default",
      "right_col_title": "Benefits",
      "right_col_bullets": [
        "Transparent selection criteria",
        "Equitable student access",
        "Structured allocation system",
        "Full accountability in delivery"
      ],
      "right_col_style": "default"
    }',
    60
  ),
  (
    'global-matching',
    'Global Learning Impact Matching',
    'International Support Coordination',
    'Globe',
    'Global Bright Futures Foundation may coordinate parallel learning support initiatives in under-resourced international communities through separate vetted education partners.',
    '{
      "left_col_extra_box_title": "Safeguard",
      "left_col_extra_box_bullets": [
        "Local school services remain fully protected",
        "Global programs are funded separately",
        "No school funds are redirected internationally"
      ],
      "left_col_extra_box_style": "blue-box",
      "right_col_title": "Benefits",
      "right_col_bullets": [
        "Strong CSR and grant alignment",
        "Expanded global education impact",
        "No disruption to local programs",
        "Enhanced partnership value"
      ],
      "right_col_style": "default"
    }',
    70
  )
ON CONFLICT (key) DO UPDATE SET
  title = EXCLUDED.title,
  tag = EXCLUDED.tag,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  details = EXCLUDED.details,
  sort_order = EXCLUDED.sort_order;
