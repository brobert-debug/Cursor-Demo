// Tiny "MCP-like" SQL tool server
import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
app.use(bodyParser.json());

const url = process.env.PG_URL || "postgres://demo:demo@127.0.0.1:5432/corp";
const pool = new pg.Pool({ connectionString: url });

app.get("/", (req, res) => res.json({ service: "mcp-sql", status: "ok" }));

app.post("/tools/sql.query", async (req, res) => {
  try {
    const { sql } = req.body || {};
    if (!sql || typeof sql !== "string") {
      return res.status(400).json({ ok: false, error: "missing sql parameter" });
    }
    console.log("Executing SQL:", sql);
    const { rows } = await pool.query(sql);
    res.json({ ok: true, rows });
  } catch (e) {
    console.error("SQL Error:", e);
    res.status(400).json({ ok: false, error: String(e) });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`MCP-SQL server listening on port ${port}`);
});
