const express = require("express");
const db = require("../db");
const ExpressError = require("../expressError");
const router = express.Router();

router.get("/", async function (req, res, next) {
  try {
    const result = await db.query(
      `SELECT i.code, i.industry, ci.comp_code
            FROM industries AS i
            LEFT JOIN company_industries AS ci
            ON i.code = ci.ind_code`
    );
    return res.status(200).json({ industries: result.rows });
  } catch (err) {
    console.error("Error:", err); // Log any errors
    return next(err);
  }
});

router.post("/", async function (req, res, next) {
  try {
    const { code, industry, comp_code } = req.body;
    await db.query("BEGIN");

    const industryResult = await db.query(
      `INSERT INTO industries (code, industry)
        VALUES ($1, $2)
        RETURNING code, industry`,
      [code, industry]
    );
    const companyIndustryResult = await db.query(
      `INSERT INTO company_industries (comp_code, ind_code)
        VALUES ($1, $2)
        RETURNING comp_code, ind_code`,
      [comp_code, code]
    );
    await db.query("COMMIT");
    const result = {
      ...industryResult.rows[0],
      ...companyIndustryResult.rows[0],
    };
    return res.status(201).json({ industry: result });
  } catch (err) {
    await db.query("ROLLBACK");
    return next(err);
  }
});

router.get("/:code", async function (req, res, next) {
  try {
    const { code } = req.params;
    const industryResult = await db.query(
      `SELECT i.code, i.industry, ci.comp_code
           FROM industries AS i
           LEFT JOIN company_industries AS ci
           ON i.code = ci.ind_code
           WHERE i.code = $1`,
      [code]
    );
    console.log(res.json({ industry: industryResult.rows[0] }));
    if (industryResult.rowCount === 0) {
      throw new ExpressError("Invalid code", 404);
    }
    return res.status(200).json({ industry: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.put("/:code", async function (req, res, next) {
  try {
    const { code } = req.params;
    const { comp_code, industry } = req.body;

    await db.query("BEGIN");

    const industryResult = await db.query(
      `UPDATE industries
            SET code = $1, industry = $2
            WHERE code = $1
            RETURNING code, industry`,
      [code, industry]
    );
    const companyIndustryResult = await db.query(
      `INSERT INTO company_industries (comp_code, ind_code)
            VALUES ($1, $2)
            ON CONFLICT (comp_code, ind_code) DO NOTHING
            RETURNING comp_code, ind_code`,
      [comp_code, code]
    );

    await db.query("COMMIT");

    const result = {
      ...industryResult.rows[0],
      ...companyIndustryResult.rows[0],
    };
    return res.status(200).json({ industry: result });
  } catch (err) {
    await db.query("ROLLBACK");
    return next(err);
  }
});
module.exports = router;

router.delete("/:code", async function (req, res, next) {
  try {
    const { code } = req.params;
    await db.query("BEGIN");

    await db.query(
      `DELETE FROM company_industries
            WHERE ind_code = $1`,
      [code]
    );
    const result = await db.query(
      `DELETE FROM industries
            WHERE code = $1`,
      [code]
    );
    await db.query("COMMIT");

    if (result.rowCount === 0) {
      throw new ExpressError("Invalid code", 404);
    }
    return res.status(200).json({ message: "deleted" });
  } catch (err) {
    await db.query("ROLLBACK");
    return next(err);
  }
});
