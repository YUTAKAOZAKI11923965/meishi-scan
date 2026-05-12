import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const TO_EMAIL = "info.ozaki@gmail.com";
const FROM_EMAIL = process.env.FROM_EMAIL; // SendGridで認証済みのメールアドレス

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { image, mediaType, ocrText } = req.body;
  if (!image || !mediaType) return res.status(400).json({ error: "Missing required fields" });

  // 拡張子を取得（例: image/jpeg → jpeg）
  const ext = mediaType.split("/")[1] || "jpg";
  const filename = `meishi_${Date.now()}.${ext}`;

  const html = `
    <h2 style="color:#1a1a2e;">📇 名刺スキャン受信</h2>
    <hr style="border:1px solid #eee;"/>
    <h3>OCR 読み取り結果</h3>
    <pre style="background:#f9f7f3;padding:16px;border-radius:4px;font-size:14px;line-height:1.8;">${ocrText || "（テキストなし）"}</pre>
    <p style="color:#7f8c8d;font-size:12px;margin-top:24px;">※ 名刺画像を添付しています。</p>
  `;

  const msg = {
    to: TO_EMAIL,
    from: FROM_EMAIL,
    subject: `【名刺スキャン】新しい名刺が届きました`,
    html,
    attachments: [
      {
        content: image,
        filename,
        type: mediaType,
        disposition: "attachment",
      },
    ],
  };

  try {
    await sgMail.send(msg);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("SendGrid error:", err?.response?.body || err);
    return res.status(500).json({ error: "メール送信に失敗しました" });
  }
}
