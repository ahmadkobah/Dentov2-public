// Diagnostic — verify ENCRYPTION_MASTER_KEY can decrypt a sample ciphertext
// Usage (inside dento-api container): node /tmp/diag-decrypt.js '<iv:tag:ct>'
const c = require('crypto');
const v = process.argv[2];
if (!v) {
  console.log('NO_INPUT');
  process.exit(1);
}
const mk = process.env.ENCRYPTION_MASTER_KEY;
console.log('KEY_LEN=' + (mk ? mk.length : 0));
console.log('KEY_FIRST6=' + (mk ? mk.slice(0, 6) : ''));
console.log('SEARCH_LEN=' + (process.env.SEARCH_HASH_KEY ? process.env.SEARCH_HASH_KEY.length : 0));
if (!mk) {
  console.log('NO_KEY');
  process.exit(2);
}
const k = c.createHash('sha256').update(mk).digest();
const [iv, tag, ct] = v.split(':');
console.log('IV_LEN=' + iv.length + ' TAG_LEN=' + tag.length + ' CT_LEN=' + ct.length);
try {
  const d = c.createDecipheriv('aes-256-gcm', k, Buffer.from(iv, 'hex'), { authTagLength: 16 });
  d.setAuthTag(Buffer.from(tag, 'hex'));
  let r = d.update(ct, 'hex', 'utf8');
  r += d.final('utf8');
  console.log('OK=' + r);
} catch (e) {
  console.log('FAIL=' + e.message);
}
