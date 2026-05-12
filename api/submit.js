import Anthropic from "@anthropic-ai/sdk";
import sgMail from "@sendgrid/mail";
import { Redis } from "@upstash/redis";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const redis = Redis.fromEnv();

const TO_EMAIL = "info.ozaki@gmail.com";
const FROM_EMAIL = process.env.FROM_EMAIL;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { image, mediaType, ocrText } = req.body;
  if (!image || !mediaType) return res.status(400).json({ error: "Missing image or mediaType" });

  const errors = [];
  let savedId = null;

  // DB保存
  try {
    const id = `meishi_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const record = { id, ocrText: ocrText || "", mediaType, image, createdAt: new Date().toISOString() };
    await redis.set(id, JSON.stringify(record));
    await redis.lpush("meishi_ids", id);
    savedId = id;
  } catch (err) {
    console.error("DB error:", err);
    errors.push("DB保存に失敗しました");
  }

  // メール送信
  try {
    const ext = mediaType.split("/")[1] || "jpg";
    const filename = `meishi_${Date.now()}.${ext}`;
    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#1a1a2e;border-bottom:3px solid #c0392b;padding-bottom:8px;">📇 名刺スキャン受信</h2>
        <h3>OCR 読み取り結果</h3>
        <pre style="background:#f9f7f3;padding:16px;border-radius:4px;font-size:14px;line-height:1.8;">${ocrText || "（テキストなし）"}</pre>
        <p style="color:#7f8c8d;font-size:12px;margin-top:24px;">
          受信日時: ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}<br>
          ※ 名刺画像を添付しています。
        </p>
      </div>`;
    await sgMail.send({
      to: TO_EMAIL, from: FROM_EMAIL,
      subject: `【名刺スキャン】新しい名刺が届きました`,
      html,
      attachments: [{ content: image, filename, type: mediaType, disposition: "attachment" }],
    });
  } catch (err) {
    console.error("SendGrid error:", err?.response?.body || err);
    errors.push("メール送信に失敗しました");
  }

  if (errors.length === 2) return res.status(500).json({ error: errors.join(" / ") });
  return res.status(200).json({ success: true, savedId, warnings: errors.length > 0 ? errors : undefined });
}
