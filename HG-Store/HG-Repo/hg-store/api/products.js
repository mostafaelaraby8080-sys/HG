const { MongoClient, ObjectId } = require("mongodb");
let client;
async function col() {
  if (!client) client = new MongoClient(process.env.MONGODB_URI).connect();
  return (await client).db("hg_store").collection("products");
}
module.exports = async (req, res) => {
  try {
    if (!process.env.ADMIN_PASSWORD)
      return res
        .status(500)
        .json({ error: "ADMIN_PASSWORD is not set on Vercel" });
    const ok = req.headers["x-admin-password"] === process.env.ADMIN_PASSWORD;
    if (req.method === "GET" && req.query.auth)
      return res.status(ok ? 200 : 401).json({ ok });
    const c = await col();
    if (req.method === "GET") {
      return res.json(await c.find().sort({ _id: -1 }).toArray());
    }
    if (!ok) return res.status(401).json({ error: "unauthorized" });
    const b = req.body || {};
    const cats = [
      "غسالات",
      "تلاجات",
      "بوتوجازات",
      "رفايع الأجهزة الكهربائية",
      "أطقم سفرة",
      "أطقم حلل",
      "كاسات",
      "كوبايات",
      "أجهزة كهربائية",
      "أدوات منزلية",
    ];
    const images = (Array.isArray(b.images) ? b.images : [])
      .slice(0, 5)
      .map((x) => String(x).slice(0, 300000));
    const d = {
      name: String(b.name || "").slice(0, 120),
      price: Number(b.price) || 0,
      category: cats.includes(b.category) ? b.category : "غسالات",
      desc: String(b.desc || "").slice(0, 500),
      images,
      image: images[0] || "",
      available: b.available !== false,
    };
    if (req.method === "POST") return res.json(await c.insertOne(d));
    if (req.method === "PUT")
      return res.json(
        await c.updateOne({ _id: new ObjectId(b.id) }, { $set: d }),
      );
    if (req.method === "DELETE")
      return res.json(await c.deleteOne({ _id: new ObjectId(b.id) }));
    res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
