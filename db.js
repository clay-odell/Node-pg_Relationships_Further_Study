/** Database setup for BizTime. */
const { Client } = require('pg');
require('dotenv').config();

const DB_USER = process.env.DB_USERNAME;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_URI = (process.env.NODE_ENV === "test")
  ? `postgresql://${DB_USER}:${DB_PASSWORD}@localhost/biztime_test`
  : `postgresql://${DB_USER}:${DB_PASSWORD}@localhost/biztime`;

let db = new Client(DB_URI);

db.connect();

module.exports = db;