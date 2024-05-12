import crypto from "node:crypto";

const encodePassword = (password, { algorithm, salt, iterations }) => {
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256");
  return `${algorithm}$${iterations}$${salt}$${hash.toString("base64")}`;
};

const decodePassword = (encoded) => {
  const [algorithm, iterations, salt, hash] = encoded.split("$");
  return {
    algorithm,
    hash,
    iterations: Number.parseInt(iterations, 10),
    salt,
  };
};

const verifyPassword = (password, encoded) => {
  const decoded = decodePassword(encoded);
  const encodedPassword = encodePassword(password, decoded);
  return encoded === encodedPassword;
};

const generatePasswordHash = (
  password,
  algorithm = "pbkdf2_sha256",
  salt = "",
  iterations = 32,
) => {
  return encodePassword(password, { algorithm, salt, iterations });
};
// <algorithm>$<iterations>$<salt>$<hash>
// const encoded =
//   "pbkdf2_sha256$120000$bOqAASYKo3vj$BEBZfntlMJJDpgkAb81LGgdzuO35iqpig0CfJPU4TbU=";
// const password = "12345678";
// console.info(verify(password, encoded));

export { verifyPassword, generatePasswordHash };
