import configs from "./configs.js";
import Database from "better-sqlite3";

function log () {
    console.log("DB ==>", ...arguments)
}

const db = new Database(configs.DATABASE_NAME, { verbose: log });

db.pragma("journal_mode = WAL");
db.exec("CREATE TABLE IF NOT EXISTS kv (key blob unique, value blob)");

function toObj(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return false;
  }
}

// const DB = new Map();
const DB = {
  get: function (key) {
    const row = db.prepare("SELECT value FROM kv WHERE key = ?").get(key);
    if (row) {
      const obj = toObj(row.value);
      if (obj) {
        return obj;
      } else {
        return row.value;
      }
    }
  },
  set: function (key, val) {
    return db
      .prepare("REPLACE INTO kv (key, value) VALUES (?,?)")
      .run(key, JSON.stringify(val));
  },
  del: function (key) {
    return db.prepare("DELETE FROM kv WHERE key = ?").run(key);
  },
  clear: function () {
    return db.prepare("DELETE FROM kv").run();
  },
  keys: async function () {
    return db.prepare("SELECT keys FROM kv").all();
  },
  length: async function () {
    const row = db.prepare("SELECT COUNT(*) AS length FROM kv").get();
    return row.length;
  },
};

export default DB;
