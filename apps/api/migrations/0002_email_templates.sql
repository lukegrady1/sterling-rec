-- Email templates table
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default templates
INSERT INTO email_templates (template_key, subject, body_html, body_text) VALUES
(
  'CONFIRMATION',
  'Registration Confirmed - {{.ProgramTitle}}',
  '<h1>Registration Confirmed!</h1>
<p>Hi {{.ParticipantName}},</p>
<p>You have been successfully registered for <strong>{{.ProgramTitle}}</strong>.</p>
{{if .SessionDate}}<p><strong>Date:</strong> {{.SessionDate}}</p>{{end}}
{{if .Location}}<p><strong>Location:</strong> {{.Location}}</p>{{end}}
<p>We look forward to seeing you!</p>
<p>If you need to cancel, please log in to your account.</p>
<p>Best regards,<br>Sterling Recreation</p>',
  'Registration Confirmed!

Hi {{.ParticipantName}},

You have been successfully registered for {{.ProgramTitle}}.
{{if .SessionDate}}Date: {{.SessionDate}}{{end}}
{{if .Location}}Location: {{.Location}}{{end}}

We look forward to seeing you!

If you need to cancel, please log in to your account.

Best regards,
Sterling Recreation'
),
(
  'WAITLIST_SPOT',
  'Added to Waitlist - {{.ProgramTitle}}',
  '<h1>You''re on the Waitlist</h1>
<p>Hi {{.ParticipantName}},</p>
<p>You have been added to the waitlist for <strong>{{.ProgramTitle}}</strong>.</p>
<p><strong>Your position:</strong> #{{.Position}}</p>
{{if .SessionDate}}<p><strong>Date:</strong> {{.SessionDate}}</p>{{end}}
<p>We''ll notify you if a spot becomes available.</p>
<p>Best regards,<br>Sterling Recreation</p>',
  'You''re on the Waitlist

Hi {{.ParticipantName}},

You have been added to the waitlist for {{.ProgramTitle}}.
Your position: #{{.Position}}
{{if .SessionDate}}Date: {{.SessionDate}}{{end}}

We''ll notify you if a spot becomes available.

Best regards,
Sterling Recreation'
),
(
  'WAITLIST_PROMOTED',
  'Spot Available - {{.ProgramTitle}}',
  '<h1>A Spot is Now Available!</h1>
<p>Hi {{.ParticipantName}},</p>
<p>Great news! A spot has opened up for <strong>{{.ProgramTitle}}</strong>, and you have been automatically registered.</p>
{{if .SessionDate}}<p><strong>Date:</strong> {{.SessionDate}}</p>{{end}}
{{if .Location}}<p><strong>Location:</strong> {{.Location}}</p>{{end}}
<p>We look forward to seeing you!</p>
<p>If you can no longer attend, please log in to cancel.</p>
<p>Best regards,<br>Sterling Recreation</p>',
  'A Spot is Now Available!

Hi {{.ParticipantName}},

Great news! A spot has opened up for {{.ProgramTitle}}, and you have been automatically registered.
{{if .SessionDate}}Date: {{.SessionDate}}{{end}}
{{if .Location}}Location: {{.Location}}{{end}}

We look forward to seeing you!

If you can no longer attend, please log in to cancel.

Best regards,
Sterling Recreation'
),
(
  'REMINDER_72H',
  'Reminder: {{.ProgramTitle}} in 3 Days',
  '<h1>Upcoming Event Reminder</h1>
<p>Hi {{.ParticipantName}},</p>
<p>This is a reminder that you are registered for <strong>{{.ProgramTitle}}</strong> in 3 days.</p>
{{if .SessionDate}}<p><strong>Date:</strong> {{.SessionDate}}</p>{{end}}
{{if .Location}}<p><strong>Location:</strong> {{.Location}}</p>{{end}}
<p>We look forward to seeing you!</p>
<p>Best regards,<br>Sterling Recreation</p>',
  'Upcoming Event Reminder

Hi {{.ParticipantName}},

This is a reminder that you are registered for {{.ProgramTitle}} in 3 days.
{{if .SessionDate}}Date: {{.SessionDate}}{{end}}
{{if .Location}}Location: {{.Location}}{{end}}

We look forward to seeing you!

Best regards,
Sterling Recreation'
),
(
  'REMINDER_24H',
  'Reminder: {{.ProgramTitle}} Tomorrow',
  '<h1>Tomorrow''s Event Reminder</h1>
<p>Hi {{.ParticipantName}},</p>
<p>This is a reminder that you are registered for <strong>{{.ProgramTitle}}</strong> tomorrow.</p>
{{if .SessionDate}}<p><strong>Date:</strong> {{.SessionDate}}</p>{{end}}
{{if .Location}}<p><strong>Location:</strong> {{.Location}}</p>{{end}}
<p>We look forward to seeing you!</p>
<p>Best regards,<br>Sterling Recreation</p>',
  'Tomorrow''s Event Reminder

Hi {{.ParticipantName}},

This is a reminder that you are registered for {{.ProgramTitle}} tomorrow.
{{if .SessionDate}}Date: {{.SessionDate}}{{end}}
{{if .Location}}Location: {{.Location}}{{end}}

We look forward to seeing you!

Best regards,
Sterling Recreation'
);
