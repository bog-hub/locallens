// lib/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);

// In development use Resend's built-in test sender — no domain verification needed.
// In production set EMAIL_FROM to a verified domain e.g. 'LocalLens <noreply@yourdomain.com>'
const FROM = process.env.NODE_ENV === 'production'
  ? (process.env.EMAIL_FROM ?? 'LocalLens <noreply@yourdomain.com>')
  : 'onboarding@resend.dev';

function baseTemplate(content: string) {
  return `
    <!DOCTYPE html><html><head><meta charset="utf-8">
    <style>
      body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:0}
      .wrap{max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb}
      .header{background:#ff3b3b;padding:24px 32px}
      .header h1{color:#fff;margin:0;font-size:22px;font-weight:700}
      .body{padding:28px 32px}
      .body p{color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px}
      .code{font-size:36px;font-weight:700;letter-spacing:8px;color:#ff3b3b;text-align:center;padding:20px;background:#fff5f5;border-radius:12px;margin:16px 0}
      .btn{display:inline-block;background:#ff3b3b;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px}
      .footer{padding:16px 32px;border-top:1px solid #f3f4f6}
      .footer p{color:#9ca3af;font-size:12px;margin:0}
    </style></head>
    <body><div class="wrap">
      <div class="header"><h1>LocalLens</h1></div>
      <div class="body">${content}</div>
      <div class="footer"><p>© ${new Date().getFullYear()} LocalLens</p></div>
    </div></body></html>
  `;
}

// ── Verification code ──────────────────────────────────────────────────────

export async function sendVerificationCode(
  to:        string,
  code:      string,
  proofType: 'email' | 'phone',
) {
  if (proofType === 'phone') {
    // TODO: Twilio integration
    console.log(`[SMS stub] Code ${code} → ${to}`);
    return;
  }

  const result = await resend.emails.send({
    from:    FROM,
    to,
    subject: `Your LocalLens verification code: ${code}`,
    html:    baseTemplate(`
      <p>You requested to claim a business on LocalLens.</p>
      <p>Enter this code to verify:</p>
      <div class="code">${code}</div>
      <p style="color:#9ca3af;font-size:13px;text-align:center">
        Expires in 15 minutes · If you didn't request this, ignore this email.
      </p>
    `),
  });

  if (result.error) {
    throw new Error(`Resend error: ${result.error.message}`);
  }

  return result;
}

// ── New review notification ────────────────────────────────────────────────

export async function sendNewReviewEmail({
  ownerEmail, ownerName, businessName, businessSlug, reviewerName, rating, reviewBody,
}: {
  ownerEmail: string; ownerName: string; businessName: string;
  businessSlug: string; reviewerName: string; rating: number; reviewBody: string;
}) {
  const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
  const url   = `${process.env.AUTH_URL ?? process.env.NEXTAUTH_URL}/businesses/${businessSlug}`;

  const result = await resend.emails.send({
    from:    FROM,
    to:      ownerEmail,
    subject: `New review for ${businessName} (${stars})`,
    html:    baseTemplate(`
      <p>Hi ${ownerName},</p>
      <p><strong>${reviewerName}</strong> left a review for <strong>${businessName}</strong>:</p>
      <p style="background:#f9fafb;border-left:3px solid #ff3b3b;padding:12px 16px;border-radius:8px;font-style:italic;">
        ${reviewBody.slice(0, 200)}${reviewBody.length > 200 ? '…' : ''}
      </p>
      <p>Rating: <strong>${stars}</strong></p>
      <a href="${url}" class="btn">View Review →</a>
    `),
  });

  if (result.error) throw new Error(result.error.message);
}

// ── Owner response notification ────────────────────────────────────────────

export async function sendOwnerResponseEmail({
  reviewerEmail, reviewerName, businessName, businessSlug, responseBody,
}: {
  reviewerEmail: string; reviewerName: string;
  businessName: string; businessSlug: string; responseBody: string;
}) {
  const url = `${process.env.AUTH_URL ?? process.env.NEXTAUTH_URL}/businesses/${businessSlug}`;

  const result = await resend.emails.send({
    from:    FROM,
    to:      reviewerEmail,
    subject: `${businessName} responded to your review`,
    html:    baseTemplate(`
      <p>Hi ${reviewerName},</p>
      <p>The owner of <strong>${businessName}</strong> responded to your review:</p>
      <p style="background:#f9fafb;border-left:3px solid #ff3b3b;padding:12px 16px;border-radius:8px;">
        ${responseBody}
      </p>
      <a href="${url}" class="btn">View Response →</a>
    `),
  });

  if (result.error) throw new Error(result.error.message);
}

// ── Welcome email ──────────────────────────────────────────────────────────

export async function sendWelcomeEmail({ email, name }: { email: string; name: string }) {
  const result = await resend.emails.send({
    from:    FROM,
    to:      email,
    subject: `Welcome to LocalLens, ${name}!`,
    html:    baseTemplate(`
      <p>Hi ${name} 👋</p>
      <p>Welcome to <strong>LocalLens</strong> — discover and review the best local businesses.</p>
      <a href="${process.env.AUTH_URL ?? process.env.NEXTAUTH_URL}/businesses" class="btn">
        Start Exploring →
      </a>
    `),
  });

  if (result.error) throw new Error(result.error.message);
}

// ── Claim approved ─────────────────────────────────────────────────────────

export async function sendClaimApprovedEmail({
  email, name, businessName, businessSlug,
}: {
  email: string; name: string; businessName: string; businessSlug: string;
}) {
  const url = `${process.env.AUTH_URL ?? process.env.NEXTAUTH_URL}/businesses/${businessSlug}`;

  const result = await resend.emails.send({
    from:    FROM,
    to:      email,
    subject: `Your claim for ${businessName} has been approved!`,
    html:    baseTemplate(`
      <p>Hi ${name},</p>
      <p>Your claim for <strong>${businessName}</strong> has been approved.</p>
      <p>You can now manage your listing, respond to reviews and update your business details.</p>
      <a href="${url}" class="btn">Go to My Listing →</a>
    `),
  });

  if (result.error) throw new Error(result.error.message);
}
// ── Claim rejected ─────────────────────────────────────────────────────────

export async function sendClaimRejectedEmail({
  email, name, businessName, reviewNote,
}: {
  email: string; name: string; businessName: string; reviewNote: string;
}) {
  const result = await resend.emails.send({
    from:    FROM,
    to:      email,
    subject: `Your claim for ${businessName} was not approved`,
    html:    baseTemplate(`
      <p>Hi ${name},</p>
      <p>Unfortunately your claim for <strong>${businessName}</strong> was not approved.</p>
      ${reviewNote ? `
      <p style="background:#fff5f5;border-left:3px solid #ff3b3b;padding:12px 16px;border-radius:8px;">
        <strong>Reason:</strong> ${reviewNote}
      </p>` : ''}
      <p>If you believe this is a mistake or have additional proof of ownership,
         please contact us and we will review your case.</p>
      <a href="${process.env.AUTH_URL ?? process.env.NEXTAUTH_URL}/contact" class="btn">
        Contact Support →
      </a>
    `),
  });

  if (result.error) throw new Error(result.error.message);
}