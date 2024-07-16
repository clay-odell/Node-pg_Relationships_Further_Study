process.env.NODE_ENV = "test";

const request = require("supertest");

const app = require("../app");
const db = require("../db");

const invoicesRouter = require("./invoices");

app.use("/invoices", invoicesRouter);

let testCompany;
let testInvoice;
beforeEach(async () => {
  const result = await db.query(
    `INSERT INTO companies (code, name, description)
        VALUES ('testcompany', 'Test Company', 'This is a test company')
        RETURNING code, name, description`
  );
  testCompany = result.rows[0];
  
  const invoiceResult = await db.query(
    `INSERT INTO invoices (comp_code, amt, paid, add_date, paid_date)
        VALUES ('testcompany', 100, false, CURRENT_DATE, null)
        RETURNING id, comp_code, amt, paid, add_date, paid_date`
  );
  testInvoice = invoiceResult.rows[0];
});

afterEach(async () => {
  await db.query(`DELETE FROM companies`);
  await db.query(`DELETE FROM invoices`);
});

afterAll(async () => {
  await db.end();
});

describe("GET /invoices", function () {
  test("Gets a list of one invoice", async function () {
    const resp = await request(app).get(`/invoices`);

    expect(resp.statusCode).toBe(200);
    expect(resp.body.invoices).toHaveLength(1);
    expect(resp.body.invoices[0].id).toEqual(testInvoice.id);
    expect(resp.body.invoices[0].comp_code).toEqual(testInvoice.comp_code);
  });
});

describe("GET /invoices/:id", function () {
  test("Gets an invoice by id and returns all relevant information and 200", async function () {
    const resp = await request(app).get(`/invoices/${testInvoice.id}`);
    let currentDate = new Date();
    currentDate = currentDate.toLocaleDateString('en-CA');

    expect(resp.statusCode).toBe(200);
    expect(resp.body.invoice.id).toEqual(testInvoice.id);
    expect(resp.body.invoice.company.code).toEqual(testCompany.code);
    expect(resp.body.invoice.amt).toEqual(testInvoice.amt);
    expect(resp.body.invoice.paid).toEqual(false);
    expect(resp.body.invoice.add_date.split('T')[0]).toEqual(currentDate);
    expect(resp.body.invoice.paid_date).toEqual(testInvoice.paid_date);
  });

  test("Returns 404 for an invoice not found", async function () {
    const resp = await request(app).get('/invoices/0');

    expect(resp.statusCode).toBe(404);
  })
});

describe("POST /invoices", function () {
    test("Creates a new invoice with comp_code and amt returns 201", async function () {
        const resp = await request(app)
        .post('/invoices')
        .send({
            comp_code: "testcompany",
            amt: 200
        });
        
        expect(resp.statusCode).toBe(201);
        expect(resp.body.invoice.comp_code).toEqual('testcompany');
        expect(resp.body.invoice.amt).toEqual(200);
        expect(resp.body.invoice.paid).toBe(false);
    });
});

describe("PUT /invoices/:id", function () {
    test("Updates an invoice amount by id and returns 200", async function () {
        const resp = await request(app)
        .put(`/invoices/${testInvoice.id}`)
        .send({
            amt: 200
        });
        
        expect(resp.statusCode).toBe(200);
        expect(resp.body.invoice.amt).toEqual(200);
    });
    test("Returns 404 for an id that doesn't exist", async function () {
        const resp = await request(app)
        .put(`/invoices/0`)
        .send({
            amt: 200
        });
        expect(resp.statusCode).toBe(404);
        
    });
});

describe("DELETE /invoices/:id", function () {
    test("Deletes an invoice by id and returns 200", async function () {
        const resp = await request(app).delete(`/invoices/${testInvoice.id}`);

        expect(resp.statusCode).toBe(200);
        expect(resp.body).toEqual({message: "deleted"});
    });
    
})