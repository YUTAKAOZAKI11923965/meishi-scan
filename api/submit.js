import Anthropic from "@anthropic-ai/sdk";
import sgMail from "@sendgrid/mail";
import { kv } from "@vercel/kv";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const TO_EMAIL = "info.ozaki@gmail.com";
const FROM_EMAIL = process.env.FROM_EMAIL;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { image, mediaType } = req.body;
  if (!image || !mediaType) return res.status(400).json({ error: "Missing image or mediaType" });

  const errors = [];
  let ocrText = "";
  let savedId = null;

  // --- STEP 1: OCR ---
  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: image },
            },
            {
              type: "text",
              text: `この名刺画像に書かれているテキストをすべて読み取ってください。
会社名、氏名、役職、住所、電話番号、メールアドレス、URLなど、すべての情報を以下のフォーマットで出力してください。
読み取れない項目は省略してください。

会社名：
氏名：
役職：
住所：
電話：
FAX：
メール：
URL：
その他：

画像が名刺でない場合や読み取れない場合は「読み取れませんでした」とだけ返してください。`,
            },
          ],
        },
      ],
    });
    ocrText = response.content[0]?.text || "読み取れませんでした";
  } catch (err) {
    console.error("OCR error:", err);
    errors.push("OCR処理に失敗しました");
    ocrText = "（OCR失敗）";
  }

  // --- STEP 2: DB保存 ---
  try {
    const id = `meishi_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const record = {
      id,
      ocrText,
      mediaType,
      image,
      createdAt: new Date().toISOString(),
    };
    await kv.set(id, JSON.stringify(record));
    await kv.lpush("meishi_ids", id);
    savedId = id;
  } catch (err) {
    console.error("DB error:", err);
    errors.push("DB保存に失敗しました");
  }

  // --- STEP 3: メール送信 ---
  try {
    const ext = mediaType.split("/")[1] || "jpg";
    const filename = `meishi_${Date.now()}.${ext}`;

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#1a1a2e;border-bottom:3px solid #c0392b;padding-bottom:8px;">📇 名刺スキャン受信</h2>
        <h3 style="color:#555;margin-top:24px;">OCR 読み取り結果</h3>
        <pre style="background:#f9f7f3;padding:16px;border-radius:4px;font-size:14px;line-height:1.8;border:1px solid #e0dbd0;">${ocrText}</pre>
        <p style="color:#7f8c8d;font-size:12px;margin-top:24px;">
          受信日時: ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}<br>
          ※ 名刺画像を添付しています。
        </p>
      </div>
    `;

    await sgMail.send({
      to: TO_EMAIL,
      from: FROM_EMAIL,
      subject: `【名刺スキャン】新しい名刺が届きました`,
      html,
      attachments: [
        { content: image, filename, type: mediaType, disposition: "attachment" },
      ],
    });
  } catch (err) {
    console.error("SendGrid error:", err?.response?.body || err);
    errors.push("メール送信に失敗しました");
  }

  // --- レスポンス ---
  if (errors.length === 3) {
    // 全ステップ失敗
    return res.status(500).json({ error: errors.join(" / ") });
  }

  return res.status(200).json({
    success: true,
    ocrText,
    savedId,
    warnings: errors.length > 0 ? errors : undefined,
  });
}
