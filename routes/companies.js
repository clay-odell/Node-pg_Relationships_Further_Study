const express = require("express");
const db = require("../db");
const ExpressError = require("../expressError");
const slugify = require('slugify');
const router = express.Router();

router.get("/", async function (req, res, next) {
  try {
    const results = await db.query(
      `SELECT code, name, description
            FROM companies`
    );
    return res.json({ companies: results.rows });
  } catch (err) {
    return next(err);
  }
});

// router.get("/:code", async function (req, res, next) {
//   try {
//     const { code } = req.params;
//     const result = await db.query(
//       `SELECT code, name, description
//             FROM companies
//             WHERE code = $1`,
//       [code]
//     );

//     return res.status(200).json({ company: result.rows[0] });
//   } catch (err) {
//     return next(err);
//   }
// });

router.post("/", async function (req, res, next) {
  try {
    let { code, name, description } = req.body;
    if (!code && name) {
        code = slugify(name, {
            lower: true, strict: true
        });
    }
    const result = await db.query(
      `INSERT INTO companies (code, name, description)
            VALUES ($1, $2, $3)
            RETURNING code, name, description`,
      [code, name, description]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return next(err);
  }
});

router.put("/:code", async function (req, res, next) {
  try {
    const { code, name, description } = req.body;
    const result = await db.query(
      `UPDATE companies SET name = $1, description = $2
            WHERE code = $3
            RETURNING code, name, description`,
      [name, description, req.params.code]
    );
    if (result.rowCount === 0) {
        throw new ExpressError(`Couldn't update company with code '${code}' because no such company exists`, 400);
    }
    return res.status(200).json({ company: result.rows[0]});
  } catch (err) {
    return next(err);
  }
});

router.delete("/:code", async function (req, res, next) {
    try {
        const { code } = req.params;
        const result = await db.query(
            `DELETE FROM companies
            WHERE code = $1`,
            [code]
        );
        if (result.rowCount === 0) {
            throw new ExpressError(`Couldn't delete company with code '${code}' because it doesn't exist`, 404);
        }
        return res.status(200).json({message: "deleted"});
    } catch (err) {
        return next(err);
    }
});

router.get("/:code", async function (req, res, next) {
    try {
        const { code } = req.params;
        const companyResult = await db.query(
            `SELECT code, name, description
            FROM companies
            WHERE code = $1`,
            [code]
        );
        if (companyResult.rowCount === 0) {
            throw new ExpressError(`Couldn't locate company with code '${code}'`, 404);
        }
        const invoiceResult = await db.query(
            `SELECT id, amt, paid, add_date, paid_date FROM invoices
            WHERE comp_code = $1`,
            [code]
        );
        const industryResult = await db.query(
            `SELECT i.code, i.industry
            FROM industries AS i
            JOIN company_industries AS ci
            ON i.code = ci.ind_code
            WHERE ci.comp_code = $1`,
            [code]
        );
        const company = companyResult.rows[0];
        company.invoices = invoiceResult.rows;
        company.industries = industryResult.rows;

        return res.status(200).json({ company: company });
        
    } catch (err) {
        return next(err);
    }
});

module.exports = router;
