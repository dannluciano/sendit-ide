import { nanoid } from "nanoid";
import { generatePasswordHash } from "../api/auth/password_hash_utils.js";
import { db } from "../api/database.js";

const stmt = db.prepare(
  "INSERT INTO users (id, uuid, username, email, password_hash, is_admin) VALUES (?, ?, ?, ?, ?, ?)",
);

try {
  stmt.run(
    1,
    nanoid(),
    "admin",
    "dannluciano@ifpi.edu.br",
    "pbkdf2_sha256$120000$bOqAASYKo3vj$BEBZfntlMJJDpgkAb81LGgdzuO35iqpig0CfJPU4TbU=",
    1,
  );
} catch {}

try {
  const password_hash = generatePasswordHash("dlcorpdlcorp");
  console.info(password_hash);

  stmt.run(
    2,
    nanoid(),
    "dannluciano",
    "dannluciano@gmail.com",
    password_hash,
    1,
  );
} catch {}
