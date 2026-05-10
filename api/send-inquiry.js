// Vercel serverless function — runs on the server, never exposed to the browser.
// Triggered by the quote generator after a visitor completes the questionnaire.
// Sends:
//   1. A notification email to the admin.
//   2. The matched pitch deck (if any) to the visitor.

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;          // e.g. erique@harecurated.co.za
const FROM_EMAIL = process.env.FROM_EMAIL;            // e.g. noreply@harecurated.co.za

const ALLOWED_ORIGIN = process.env.SITE_URL ?? 'https://harecurated.co.za';

async function sendEmail({ to, subject, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
  return res.json();
}

function formatResponses(responses) {
  return Object.entries(responses ?? {})
    .map(([k, v]) => `<tr><td style="padding:6px 12px;border:1px solid #ddd;">${k}</td><td style="padding:6px 12px;border:1px solid #ddd;">${v}</td></tr>`)
    .join('');
}

function adminEmailHTML({ visitor_name, visitor_email, responses, pitch_deck_url, pitch_deck_name }) {
  return `
    <div style="font-family:sans-serif;max-width:600px;">
      <h2 style="color:#2d2d2d;">New Quote Inquiry</h2>
      <p><strong>Name:</strong> ${visitor_name}</p>
      <p><strong>Email:</strong> <a href="mailto:${visitor_email}">${visitor_email}</a></p>
      <h3>Questionnaire Answers</h3>
      <table style="border-collapse:collapse;width:100%;">
        <thead>
          <tr>
            <th style="padding:6px 12px;border:1px solid #ddd;text-align:left;">Question</th>
            <th style="padding:6px 12px;border:1px solid #ddd;text-align:left;">Answer</th>
          </tr>
        </thead>
        <tbody>${formatResponses(responses)}</tbody>
      </table>
      ${pitch_deck_url
        ? `<p><strong>Pitch Deck Sent:</strong> ${pitch_deck_name ?? 'Unknown'}<br>
           <a href="${pitch_deck_url}">View PDF</a></p>`
        : '<p><em>No pitch deck matched for these answers.</em></p>'}
    </div>
  `;
}

function visitorEmailHTML({ visitor_name, pitch_deck_url, pitch_deck_name }) {
  if (pitch_deck_url) {
    return `
      <div style="font-family:sans-serif;max-width:600px;">
        <h2 style="color:#2d2d2d;">Your Hare Curated Proposal</h2>
        <p>Hi ${visitor_name},</p>
        <p>Thank you for reaching out! We've put together a proposal tailored to your needs.</p>
        <p>
          <a href="${pitch_deck_url}"
             style="display:inline-block;padding:12px 24px;background:#2d2d2d;color:#fff;text-decoration:none;border-radius:4px;">
            View Your Proposal PDF
          </a>
        </p>
        <p>We'll be in touch soon to discuss the details. Feel free to reply to this email with any questions.</p>
        <p style="color:#888;font-size:13px;">Hare Curated &mdash; Where Artistry and Design Meet Nature</p>
      </div>
    `;
  }

  return `
    <div style="font-family:sans-serif;max-width:600px;">
      <h2 style="color:#2d2d2d;">Thank You for Your Inquiry</h2>
      <p>Hi ${visitor_name},</p>
      <p>Thank you for reaching out to Hare Curated! We've received your inquiry and will be in touch shortly with a tailored proposal.</p>
      <p style="color:#888;font-size:13px;">Hare Curated &mdash; Where Artistry and Design Meet Nature</p>
    </div>
  `;
}

export default async function handler(req, res) {
  // CORS — only allow requests from the live site.
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { visitor_name, visitor_email, responses, pitch_deck_url, pitch_deck_name } = req.body ?? {};

  if (!visitor_email || !visitor_name) {
    return res.status(400).json({ error: 'visitor_name and visitor_email are required' });
  }

  // Basic email format check server-side.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(visitor_email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  try {
    await Promise.all([
      // 1. Admin notification.
      sendEmail({
        to: ADMIN_EMAIL,
        subject: `New Quote Inquiry from ${visitor_name}`,
        html: adminEmailHTML({ visitor_name, visitor_email, responses, pitch_deck_url, pitch_deck_name }),
      }),
      // 2. Visitor confirmation + pitch deck link.
      sendEmail({
        to: visitor_email,
        subject: 'Your Hare Curated Proposal',
        html: visitorEmailHTML({ visitor_name, pitch_deck_url, pitch_deck_name }),
      }),
    ]);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('send-inquiry error:', err);
    return res.status(500).json({ error: 'Failed to send emails' });
  }
}
