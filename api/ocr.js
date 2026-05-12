import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { image, mediaType } = req.body;
  if (!image || !mediaType) return res.status(400).json({ error: "Missing image or mediaType" });

  // 画像サイズチェック（4MB以上は拒否）
  const sizeInBytes = Buffer.byteLength(image, 'base64');
  if (sizeInBytes > 4 * 1024 * 1024) {
    return res.status(400).json({ error: "画像が大きすぎます" });
  }

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
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

    const text = response.content[0]?.text || "読み取れませんでした";
    return res.status(200).json({ text });

  } catch (err) {
    console.error("OCR error:", JSON.stringify(err));
    return res.status(500).json({ 
      error: "OCR処理に失敗しました",
      detail: err.message || "unknown error"
    });
  }
}
