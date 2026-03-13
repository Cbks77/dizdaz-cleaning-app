import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

const db = new Database("dizdaz.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS cleaning_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    rooms_cleaned TEXT NOT NULL,
    daily_total REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS room_codes (
    property_id TEXT NOT NULL,
    room_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    PRIMARY KEY (property_id, room_id)
  );
`);

// Seed default codes if empty
const existingCodes = db.prepare("SELECT COUNT(*) as count FROM room_codes").get() as { count: number };
if (existingCodes.count === 0) {
  const insert = db.prepare("INSERT INTO room_codes (property_id, room_id, code) VALUES (?, ?, ?)");
  
  // Berkley
  for (let i = 1; i <= 15; i++) {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    const seed = (i * 7 + month * 13 + year * 3) % 10000;
    const code = seed.toString().padStart(4, '0');
    insert.run('BERKLEY', i, code);
  }

  // Brunel
  for (let i = 1; i <= 3; i++) {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    const seed = (i * 11 + month * 17 + year * 5) % 10000;
    const code = seed.toString().padStart(4, '0');
    insert.run('BRUNEL', i, code);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/room-codes", (req, res) => {
    const { property_id } = req.query;
    try {
      let codes;
      if (property_id) {
        codes = db.prepare("SELECT * FROM room_codes WHERE property_id = ?").all(property_id);
      } else {
        codes = db.prepare("SELECT * FROM room_codes").all();
      }
      res.json(codes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch room codes" });
    }
  });

  app.post("/api/room-codes", (req, res) => {
    const { property_id, room_id, code } = req.body;
    try {
      db.prepare("INSERT OR REPLACE INTO room_codes (property_id, room_id, code) VALUES (?, ?, ?)")
        .run(property_id, room_id, code);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update room code" });
    }
  });

  app.get("/api/logs", (req, res) => {
    try {
      const logs = db.prepare("SELECT * FROM cleaning_logs ORDER BY date DESC").all();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  app.get("/api/get-monthly-cleans", (req, res) => {
    const { month } = req.query;
    try {
      let logs;
      if (month) {
        logs = db.prepare("SELECT * FROM cleaning_logs WHERE date LIKE ? ORDER BY date DESC").all(`%${month}%`);
      } else {
        logs = db.prepare("SELECT * FROM cleaning_logs ORDER BY date DESC").all();
      }
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch monthly cleans" });
    }
  });

  app.post("/api/logs", (req, res) => {
    const { date, rooms_cleaned, daily_total } = req.body;
    try {
      const info = db.prepare(
        "INSERT INTO cleaning_logs (date, rooms_cleaned, daily_total) VALUES (?, ?, ?)"
      ).run(date, rooms_cleaned, daily_total);
      res.json({ id: info.lastInsertRowid });
    } catch (error) {
      res.status(500).json({ error: "Failed to save log" });
    }
  });

  app.delete("/api/logs", (req, res) => {
    try {
      db.prepare("DELETE FROM cleaning_logs").run();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear logs" });
    }
  });

  app.get("/api/invoice/download", (req, res) => {
    const { property_name } = req.query;
    try {
      const logs = db.prepare("SELECT * FROM cleaning_logs ORDER BY date ASC").all();
      const total = logs.reduce((sum, log) => sum + log.daily_total, 0);
      
      const doc = new PDFDocument({ margin: 50 });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=DIZDAZ_Invoice.pdf');
      
      doc.pipe(res);

      // Header
      doc.fillColor("#137fec").fontSize(24).text("DIZDAZ CLEANING INVOICE", { align: "left" });
      doc.moveDown();
      
      doc.fillColor("#444444").fontSize(10).text(`INV-${new Date().getFullYear()}-${new Date().getMonth() + 1}-01`, { align: "left" });
      doc.text(`Date Issued: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`, { align: "right" });
      doc.moveDown(2);

      // Billing Info
      const top = doc.y;
      doc.fillColor("#999999").fontSize(10).text("BILLED TO:", 50, top);
      doc.fillColor("#000000").fontSize(12).text((property_name as string) || "YOUR APARTMENT", 50, top + 15);
      doc.fillColor("#666666").fontSize(10).text("26-28 Regent Street\nClifton\nBristol\nBS8 4HG", 50, top + 35);

      doc.fillColor("#999999").fontSize(10).text("FROM:", 350, top);
      doc.fillColor("#000000").fontSize(12).text("DizDaz cleaning", 350, top + 15);
      doc.fillColor("#666666").fontSize(10).text("Abbotsford Road\nBristol\nBS6 6EF", 350, top + 35);
      
      doc.moveDown(4);

      // Table Header
      const tableTop = doc.y;
      doc.rect(50, tableTop, 500, 20).fill("#f6f7f8");
      doc.fillColor("#666666").fontSize(10).text("Date", 60, tableTop + 5);
      doc.text("Rooms Cleaned", 150, tableTop + 5);
      doc.text("Daily Total", 450, tableTop + 5, { align: "right" });
      
      doc.moveDown();

      // Table Rows
      logs.forEach((log, i) => {
        const y = doc.y;
        doc.fillColor("#000000").fontSize(10).text(log.date, 60, y);
        doc.text(log.rooms_cleaned.replace(/Units/g, 'Rooms'), 150, y);
        doc.text(`£${log.daily_total.toFixed(2)}`, 450, y, { align: "right" });
        doc.moveTo(50, y + 15).lineTo(550, y + 15).strokeColor("#eeeeee").stroke();
        doc.moveDown();
      });

      // Total
      doc.moveDown();
      const totalBoxY = doc.y;
      doc.rect(50, totalBoxY, 500, 40).fill("#137fec");
      doc.fillColor("#ffffff").fontSize(14).text("TOTAL DUE FOR MONTH", 70, totalBoxY + 12);
      doc.fontSize(20).text(`£${total.toFixed(2)}`, 50, totalBoxY + 8, { width: 450, align: "right" });
      doc.moveDown(2);

      // Payment Info
      doc.moveDown(3);
      doc.fillColor("#999999").fontSize(10).text("PAYMENT INFORMATION", 50, doc.y);
      doc.moveDown();
      doc.fillColor("#666666").text("Bank: Starling Bank");
      doc.text("Payee: Jodie Francis");
      doc.text("Sort Code: 60-83-71");
      doc.text("Account Number: 12138365");
      doc.moveDown();
      doc.fillColor("#999999").fontSize(8).text("TERMS: PAYMENT REQUIRED WITHIN 14 DAYS.");

      doc.end();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
