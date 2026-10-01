/**
 * Mailgun transactional email.
 *
 * Sends order confirmation emails through the Mailgun REST API using the
 * credentials from "API keys/Mailgun keys.txt":
 *   API key        -> MAILGUN_API_KEY
 *   Sandbox domain -> MAILGUN_DOMAIN  (sandbox7b99....mailgun.org)
 *   Base URL       -> MAILGUN_BASE_URL (https://api.mailgun.net)
 *
 * NOTE: Mailgun sandbox domains can only deliver to *Authorized Recipients*
 * (configured in the Mailgun dashboard). If the recipient isn't authorized,
 * Mailgun rejects the send and we record `confirmation_email_sent = false`
 * on the order — the store keeps working either way.
 */

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY ?? "";
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN ?? "";
const MAILGUN_BASE_URL = process.env.MAILGUN_BASE_URL ?? "https://api.mailgun.net";

/** True when Mailgun credentials are present in the environment. */
export function isMailgunConfigured(): boolean {
  return Boolean(MAILGUN_API_KEY && MAILGUN_DOMAIN);
}

/** Low-level "send an email" call to the Mailgun messages API. */
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isMailgunConfigured()) {
    return { ok: false, error: "Mailgun is not configured (missing MAILGUN_API_KEY/MAILGUN_DOMAIN)" };
  }
  try {
    // Mailgun authenticates with HTTP Basic auth: username "api", password = key.
    const res = await fetch(`${MAILGUN_BASE_URL}/v3/${MAILGUN_DOMAIN}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${MAILGUN_API_KEY}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        // Sandbox domains must send from an address on the sandbox domain itself.
        from: `Village Mart <postmaster@${MAILGUN_DOMAIN}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });
    if (!res.ok) {
      return { ok: false, error: `Mailgun ${res.status}: ${await res.text()}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Build the branded HTML confirmation email for an order.
 * (Inline styles only — email clients strip <style> blocks.)
 */
export function buildOrderConfirmationEmail(params: {
  orderNumber: string;
  customerName: string;
  items: { name: string; unitLabel: string | null; unitPrice: number; quantity: number; lineTotal: number }[];
  subtotal: number;
  discountAmount: number;
  promoCode: string | null;
  deliveryFee: number;
  total: number;
  delivery: { address: string; city: string; state: string; phone: string };
  paymentMethod: string;
}): { html: string; text: string } {
  const { orderNumber, customerName, items, subtotal, discountAmount, promoCode, deliveryFee, total, delivery, paymentMethod } = params;

  // One <tr> per purchased item.
  const itemRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;">
          ${item.name}${item.unitLabel ? ` <span style="color:#64748b;">(${item.unitLabel})</span>` : ""}
          <br />
          <span style="color:#64748b;font-size:12px;">${item.quantity} × ₦${item.unitPrice.toLocaleString("en-NG")}</span>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;text-align:right;color:#0f172a;font-weight:600;">
          ₦${item.lineTotal.toLocaleString("en-NG")}
        </td>
      </tr>`
    )
    .join("");

  const html = `
  <div style="background:#f1f5f9;padding:24px 0;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
      <!-- Brand header -->
      <div style="background:#0b1b33;padding:20px 28px;">
        <span style="color:#ffffff;font-size:20px;font-weight:700;">Village<span style="color:#60a5fa;">Mart</span></span>
        <span style="float:right;color:#94a3b8;font-size:12px;padding-top:6px;">Fresh foodstuff, honest prices</span>
      </div>
      <div style="padding:28px;">
        <h1 style="margin:0 0 6px;font-size:20px;color:#0f172a;">Thank you for your order, ${customerName}!</h1>
        <p style="margin:0 0 20px;color:#475569;font-size:14px;">
          We've received your order <strong>#${orderNumber}</strong> and our team is preparing it for dispatch.
        </p>

        <!-- Items -->
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          ${itemRows}
          <tr>
            <td style="padding:10px 0;color:#475569;">Subtotal</td>
            <td style="padding:10px 0;text-align:right;color:#0f172a;">₦${subtotal.toLocaleString("en-NG")}</td>
          </tr>
          ${
            discountAmount > 0
              ? `<tr>
            <td style="padding:2px 0;color:#16a34a;">Promo discount${promoCode ? ` (${promoCode})` : ""}</td>
            <td style="padding:2px 0;text-align:right;color:#16a34a;">−₦${discountAmount.toLocaleString("en-NG")}</td>
          </tr>`
              : ""
          }
          <tr>
            <td style="padding:2px 0;color:#475569;">Delivery</td>
            <td style="padding:2px 0;text-align:right;color:#0f172a;">${deliveryFee === 0 ? "FREE" : `₦${deliveryFee.toLocaleString("en-NG")}`}</td>
          </tr>
          <tr>
            <td style="padding:12px 0;font-weight:700;color:#0f172a;font-size:16px;">Total</td>
            <td style="padding:12px 0;text-align:right;font-weight:700;color:#2563eb;font-size:16px;">₦${total.toLocaleString("en-NG")}</td>
          </tr>
        </table>

        <!-- Delivery details -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin-top:16px;font-size:13px;color:#475569;line-height:1.7;">
          <strong style="color:#0f172a;">Delivery details</strong><br />
          ${delivery.address}, ${delivery.city}, ${delivery.state}<br />
          Phone: ${delivery.phone}<br />
          Payment: ${paymentMethod}
        </div>

        <p style="margin:20px 0 0;color:#94a3b8;font-size:12px;">
          Questions about this order? Just reply to this email — we're happy to help.
        </p>
      </div>
      <div style="background:#0b1b33;padding:14px 28px;color:#94a3b8;font-size:12px;text-align:center;">
        © ${new Date().getFullYear()} Village Mart · Fresh foodstuff delivered to your door
      </div>
    </div>
  </div>`;

  const text = [
    `Thank you for your order, ${customerName}!`,
    ``,
    `Order #${orderNumber}`,
    ...items.map((i) => `- ${i.name}${i.unitLabel ? ` (${i.unitLabel})` : ""} x${i.quantity} = ₦${i.lineTotal.toLocaleString("en-NG")}`),
    `Subtotal: ₦${subtotal.toLocaleString("en-NG")}`,
    discountAmount > 0 ? `Promo discount${promoCode ? ` (${promoCode})` : ""}: −₦${discountAmount.toLocaleString("en-NG")}` : "",
    `Delivery: ${deliveryFee === 0 ? "FREE" : `₦${deliveryFee.toLocaleString("en-NG")}`}`,
    `Total: ₦${total.toLocaleString("en-NG")}`,
    ``,
    `Deliver to: ${delivery.address}, ${delivery.city}, ${delivery.state} (Phone: ${delivery.phone})`,
    `Payment method: ${paymentMethod}`,
  ].join("\n");

  return { html, text };
}
