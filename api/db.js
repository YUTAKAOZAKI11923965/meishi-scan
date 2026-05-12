import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { image, mediaType, ocrText } = req.body;
    if (!image || !mediaType) return res.status(400).json({ error: "Missing required fields" });

    const id = `meishi_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const record = { id, ocrText: ocrText || "", mediaType, image, createdAt: new Date().toISOString() };

    await redis.set(id, JSON.stringify(record));
    await redis.lpush("meishi_ids", id);

    return res.status(200).json({ success: true, id });

  } else if (req.method === "GET") {
    const ids = await redis.lrange("meishi_ids", 0, 49);
    if (!ids || ids.length === 0) return res.status(200).json({ records: [] });

    const records = await Promise.all(
      ids.map(async (id) => {
        const raw = await redis.get(id);
        if (!raw) return null;
        const rec = typeof raw === "string" ? JSON.parse(raw) : raw;
        const { image: _img, ...rest } = rec;
        return rest;
      })
    );
    return res.status(200).json({ records: records.filter(Boolean) });
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}
