const express = require("express");
const db = require("../db");
const ExpressError = require("../expressError");
const router = express.Router();

router.get("/", async function (req, res, next) {
  try {
    const result = await db.query(
      `SELECT id, comp_code
            FROM invoices`
    );
    return res.status(200).json({ invoices: result.rows });
  } catch (err) {
    return next(err);
  }
});

router.get("/:id", async function (req, res, next) {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT id, amt, paid, add_date, paid_date, comp_code, companies.name, companies.description
            FROM invoices
            JOIN companies ON invoices.comp_code = companies.code
            WHERE id = $1`,
      [id]
    );
    if (result.rowCount === 0) {
      throw new ExpressError("Invoice not found", 404);
    }
    const data = result.rows[0];
    const response = {
      invoice: {
        id: data.id,
        amt: data.amt,
        paid: data.paid,
        add_date: data.add_date,
        paid_date: data.paid_date,
        company: {
          code: data.comp_code,
          name: data.name,
          description: data.description,
        },
      },
    };
    return res.status(200).json(response);
  } catch (err) {
    return next(err);
  }
});

router.post("/", async function (req, res, next) {
  try {
    const { comp_code, amt } = req.body;
    const result = await db.query(
      `INSERT INTO invoices (comp_code, amt, paid, add_date, paid_date)
            VALUES ($1, $2, false, CURRENT_DATE, null)
            RETURNING id, comp_code, amt, paid, add_date, paid_date`,
      [comp_code, amt]
    );
    return res.status(201).json({ invoice: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.put("/:id", async function (req, res, next) {
  try {
    const { id } = req.params;
    const { amt, paid } = req.body;
    const currentInvoiceRes = await db.query(
      `SELECT paid FROM invoices
        WHERE id = $1`,
      [id]
    );
    if (currentInvoiceRes.rowCount === 0) {
      throw new ExpressError("Invoice not found", 404);
    }
    const currentPaidStatus = currentInvoiceRes.rows[0].paid;
    let paidDate = null;
    if (!currentPaidStatus && paid) {
      paidDate = new Date();
    } else if (currentPaidStatus && !paid) {
      paidDate = null;
    } else {
      const currentPaidDateRes = await db.query(
        `SELECT paid_date FROM invoices where id = $1`,
        [id]
      );
      paidDate = currentPaidDateRes.rows[0].paid_date;
    }
    const result = await db.query(
      `UPDATE invoices SET amt = $1, paid =$2, paid_date = $3
        WHERE id = $4
        RETURNING id, comp_code, amt, paid, add_date, paid_date`,
      [amt, paid, paidDate, id]
    );
    if (result.rowCount === 0) {
      throw new ExpressError("Invoice could not be found", 404);
    }
    return res.status(200).json({ invoice: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.delete("/:id", async function (req, res, next) {
  try {
    const { id } = req.params;
    const result = await db.query(
      `DELETE FROM invoices
            WHERE id = $1`,
      [id]
    );
    if (result.rowCount === 0) {
      throw new ExpressError("Invoice could not be found", 404);
    }
    return res.status(200).json({ message: "deleted" });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
