process.env.NODE_ENV = "test";

const request = require("supertest");

const app = require("../app");
const db = require("../db");

const companiesRouter = require('./companies');

app.use('/companies', companiesRouter);

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

describe("GET /companies", function () {
    test("Gets a list of one company", async function () {
        const resp = await request(app).get(`/companies`);
        expect(resp.statusCode).toBe(200);
        expect(resp.body.companies).toHaveLength(1);

        const company = resp.body.companies[0];
        expect(company.code).toEqual(testCompany.code);
        expect(company.name).toEqual(testCompany.name);
        expect(company.description).toEqual(testCompany.description);
    });
});

describe("GET /companies/:code", function () {
    test("Returns 404 for no such company", async function () {
        const resp = await request(app).get(`/companies/nosuchcode`);
        expect(resp.statusCode).toBe(404);
    });
});

describe("GET /companies/:code", function (){
    test("Gets a single company with its invoices", async function () {
        const resp = await request(app).get(`/companies/${testCompany.code}`);
        expect(resp.statusCode).toBe(200);
        expect(resp.body.company.code).toEqual(testCompany.code);
        expect(resp.body.company.name).toEqual(testCompany.name);
        expect(resp.body.company.description).toEqual(testCompany.description);
        expect(resp.body.company.invoices[0].amt).toEqual(testInvoice.amt);
    });
});

describe("POST /companies", function () {
    test("Posts a code, name, and description to companies, and returns 201", async function () {
        const resp = await request(app)
            .post(`/companies`)
            .send({
                code: 'newcompany',
                name: 'New Company',
                description: 'This is a new company'
            });
        expect(resp.statusCode).toBe(201);
        expect(resp.body).toEqual({
            code: 'newcompany',
            name: 'New Company',
            description: 'This is a new company'
        });
    });
});

describe("PUT /companies", function () {
    test("Updates a code, name, and description from companies and returns 200", async function () {
        const resp = await request(app)
        .put(`/companies/${testCompany.code}`)
        .send({
            name: 'Updated Company',
            description: 'This is an updated company'
        });

        expect(resp.statusCode).toBe(200);
        expect(resp.body.company).toHaveProperty('code', testCompany.code);
        expect(resp.body.company).toHaveProperty('name', 'Updated Company');
        expect(resp.body.company).toHaveProperty('description', 'This is an updated company');
    });
});

describe("DELETE /companies/:code", function (){
    test ("Deletes a company from companies by code and returns 200", async function() {
        const resp = await request(app)
        .delete(`/companies/${testCompany.code}`);
        
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toEqual({message: "deleted"});
    });
});