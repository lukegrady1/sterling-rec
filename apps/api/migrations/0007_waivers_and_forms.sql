-- Migration 0007: Waivers and Forms System
-- Implements program waivers with versioning and family forms management

-- Waivers table: Stores versioned waiver documents
CREATE TABLE IF NOT EXISTS waivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    body_html TEXT NOT NULL,
    version INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_waivers_active ON waivers(is_active);
CREATE INDEX idx_waivers_title ON waivers(title);

-- Program waivers: Assigns waivers to programs
CREATE TABLE IF NOT EXISTS program_waivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    waiver_id UUID NOT NULL REFERENCES waivers(id) ON DELETE CASCADE,
    is_required BOOLEAN NOT NULL DEFAULT true,
    is_per_season BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(program_id, waiver_id)
);

CREATE INDEX idx_program_waivers_program ON program_waivers(program_id);
CREATE INDEX idx_program_waivers_waiver ON program_waivers(waiver_id);

-- Participant waiver acceptances: Tracks who accepted which waiver version
CREATE TABLE IF NOT EXISTS participant_waiver_acceptances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    waiver_id UUID NOT NULL REFERENCES waivers(id) ON DELETE RESTRICT,
    waiver_version INT NOT NULL,
    program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
    accepted_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address TEXT,
    user_agent TEXT,
    UNIQUE(participant_id, waiver_id, waiver_version, program_id)
);

CREATE INDEX idx_waiver_acceptances_participant ON participant_waiver_acceptances(participant_id);
CREATE INDEX idx_waiver_acceptances_waiver ON participant_waiver_acceptances(waiver_id);
CREATE INDEX idx_waiver_acceptances_program ON participant_waiver_acceptances(program_id);

-- Form templates: Reusable form definitions
CREATE TABLE IF NOT EXISTS form_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL, -- 'medical', 'emergency', 'custom'
    title TEXT NOT NULL,
    description TEXT,
    schema_json JSONB NOT NULL, -- JSON schema for form fields
    version INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_form_templates_type ON form_templates(type);
CREATE INDEX idx_form_templates_active ON form_templates(is_active);

-- Participant form submissions: Per-child saved form data
CREATE TABLE IF NOT EXISTS participant_form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    form_template_id UUID NOT NULL REFERENCES form_templates(id) ON DELETE RESTRICT,
    form_version INT NOT NULL,
    data_json JSONB NOT NULL, -- Submitted form data
    submitted_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(participant_id, form_template_id)
);

CREATE INDEX idx_form_submissions_participant ON participant_form_submissions(participant_id);
CREATE INDEX idx_form_submissions_template ON participant_form_submissions(form_template_id);

-- Seed sample waivers
INSERT INTO waivers (id, title, description, body_html, version, is_active) VALUES
(
    '00000000-0000-0000-0000-000000000001'::UUID,
    'General Liability Waiver',
    'Required for all program participation',
    '<h2>Liability Release and Waiver</h2>
<p>In consideration of being allowed to participate in any way in Sterling Recreation programs and activities, I, the undersigned, acknowledge, appreciate, and agree that:</p>
<ol>
<li><strong>Assumption of Risk:</strong> I understand that participation in recreational activities involves risks including, but not limited to, bodily injury, death, and property damage. I acknowledge these risks and voluntarily assume all risks associated with participation.</li>
<li><strong>Release of Liability:</strong> I, for myself and on behalf of my child/ward, hereby release, waive, discharge and covenant not to sue Sterling Recreation, its officers, employees, volunteers, and agents from any and all liability, claims, demands, actions and causes of action whatsoever arising out of or related to any loss, damage, or injury that may be sustained by me or my child/ward.</li>
<li><strong>Medical Authorization:</strong> I authorize Sterling Recreation staff to secure emergency medical treatment for my child/ward if necessary, and I agree to be responsible for the cost of such treatment.</li>
<li><strong>Photographic Release:</strong> I grant permission for Sterling Recreation to use photographs or video recordings of my child/ward for promotional purposes.</li>
</ol>
<p>I have read this waiver and fully understand its terms. I understand that I am giving up substantial rights, including my right to sue.</p>',
    1,
    true
),
(
    '00000000-0000-0000-0000-000000000002'::UUID,
    'Photo Release Authorization',
    'Permission to use photos in promotional materials',
    '<h2>Photo and Video Release</h2>
<p>I grant Sterling Recreation permission to use photographs, video recordings, or digital images of my child/ward taken during program activities.</p>
<h3>Usage Authorization</h3>
<p>These images may be used in:</p>
<ul>
<li>Promotional materials (brochures, flyers, newsletters)</li>
<li>Website and social media platforms</li>
<li>Annual reports and fundraising materials</li>
<li>News media and press releases</li>
</ul>
<h3>Rights and Ownership</h3>
<p>I understand that:</p>
<ul>
<li>All photographs and videos become property of Sterling Recreation</li>
<li>No compensation will be provided for use of these images</li>
<li>Images may be edited or altered at Sterling Recreation''s discretion</li>
<li>I may request removal of specific images by contacting Sterling Recreation in writing</li>
</ul>
<p>This authorization remains in effect unless I revoke it in writing.</p>',
    1,
    true
),
(
    '00000000-0000-0000-0000-000000000003'::UUID,
    'Swimming Program Safety Waiver',
    'Additional waiver required for aquatic programs',
    '<h2>Swimming Program Safety Acknowledgment</h2>
<p>I acknowledge that my child/ward will be participating in aquatic activities at Sterling Recreation facilities.</p>
<h3>Swimming Ability</h3>
<p>I certify that my child/ward:</p>
<ul>
<li>☐ Can swim independently and is comfortable in deep water</li>
<li>☐ Can swim but requires supervision in deep water</li>
<li>☐ Cannot swim and requires constant supervision and flotation devices</li>
</ul>
<h3>Medical Conditions</h3>
<p>I have disclosed any medical conditions that may affect my child''s ability to participate safely in swimming activities, including but not limited to:</p>
<ul>
<li>Heart conditions</li>
<li>Seizure disorders</li>
<li>Ear infections or tubes</li>
<li>Skin conditions</li>
<li>Respiratory conditions (asthma, etc.)</li>
</ul>
<h3>Safety Rules</h3>
<p>I have discussed the following safety rules with my child/ward:</p>
<ol>
<li>Always follow lifeguard and instructor directions</li>
<li>No running on pool deck</li>
<li>No diving in shallow water</li>
<li>Stay within designated swimming areas</li>
<li>Report any injuries or concerns immediately to staff</li>
</ol>
<p>I understand that failure to follow these rules may result in removal from the program without refund.</p>',
    1,
    true
);

COMMENT ON TABLE waivers IS 'Versioned waiver documents that can be assigned to programs';
COMMENT ON TABLE program_waivers IS 'Many-to-many relationship between programs and waivers';
COMMENT ON TABLE participant_waiver_acceptances IS 'Records of waiver acceptances by participants (children)';
COMMENT ON TABLE form_templates IS 'Reusable form definitions with JSON schema';
COMMENT ON TABLE participant_form_submissions IS 'Per-participant saved form data';
