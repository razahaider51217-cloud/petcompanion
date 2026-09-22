// set_origin.js — point Server A's blob loader at a Server B origin.
//
// USAGE:  node set_origin.js [ORIGIN]     (default: http://localhost:3000)
//
// Encrypts ORIGIN with URL_KEY (CryptoJS-compatible AES-256-CBC, "Salted__" format)
// and rewrites the ENC_DATA_ORIGIN line in index.html. Run it again after deploying
// Server B so the live landing page fetches the live payload, e.g.:
//   node set_origin.js https://your-app.ondigitalocean.app
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const URL_KEY = 'UrLk3yShopEase01'; // MUST match Server A's const URL_KEY
const ORIGIN = (process.argv[2] || 'http://localhost:3000').replace(/\/+$/, '');

function evpBytesToKey(password, salt, keyLen, ivLen) {
  let d = Buffer.alloc(0), out = Buffer.alloc(0);
  while (out.length < keyLen + ivLen) {
    const h = crypto.createHash('md5');
    h.update(d); h.update(password); h.update(salt);
    d = h.digest();
    out = Buffer.concat([out, d]);
  }
  return { key: out.slice(0, keyLen), iv: out.slice(keyLen, keyLen + ivLen) };
}
function encryptWithPassphrase(plaintext, passphrase) {
  const salt = crypto.randomBytes(8);
  const { key, iv } = evpBytesToKey(Buffer.from(passphrase, 'utf8'), salt, 32, 16);
  const c = crypto.createCipheriv('aes-256-cbc', key, iv);
  const enc = Buffer.concat([c.update(Buffer.from(plaintext, 'utf8')), c.final()]);
  return Buffer.concat([Buffer.from('Salted__', 'ascii'), salt, enc]).toString('base64');
}

const idx = path.join(__dirname, 'index.html');
let t = fs.readFileSync(idx, 'utf8');
if (!/const ENC_DATA_ORIGIN = "[^"]*";/.test(t)) {
  console.error('FATAL: could not find the ENC_DATA_ORIGIN line in index.html');
  process.exit(1);
}
const cipher = encryptWithPassphrase(ORIGIN, URL_KEY);
t = t.replace(/const ENC_DATA_ORIGIN = "[^"]*";/, 'const ENC_DATA_ORIGIN = "' + cipher + '";');
fs.writeFileSync(idx, t);
console.log('ENC_DATA_ORIGIN set in index.html; decrypts to: ' + ORIGIN);
