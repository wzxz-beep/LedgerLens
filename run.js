const assert = require('node:assert/strict');
const C = require('../core.js');
let passed=0; function test(name,fn){fn();passed++;console.log('✓ '+name)}
test('money is converted to integer cents without float drift',()=>{assert.equal(C.cents('19.99'),1999);assert.equal(C.cents('-0.10'),-10);assert.equal(C.cents('1,234.56'),123456)});
test('references normalize case and whitespace',()=>assert.equal(C.normalizeRef(' tx  - 09 '),'TX-09'));
test('CSV parser handles quoted commas and escaped quotes',()=>{const r=C.parseCSV('reference,description,amount\nA1,"Settlement, west",12.30\nA2,"She said ""ok""",-1.00');assert.equal(r[0].description,'Settlement, west');assert.equal(r[1].description,'She said "ok"')});
test('reconciliation matches equal cents and identifies amount difference',()=>{const r=C.reconcile([{reference:'a',amount:'10.00'},{reference:'b',amount:'4.00'}],[{reference:'A',amount:'10.00'},{reference:'B',amount:'3.50'}]);assert.equal(r[0].status,'matched');assert.equal(r[1].status,'amount_mismatch');assert.equal(r[1].differenceCents,50)});
test('unmatched rows remain visible and duplicate refs are not guessed',()=>{const r=C.reconcile([{reference:'x',amount:'1'}],[{reference:'z',amount:'1'},{reference:'z',amount:'1'}]);assert.equal(r[0].status,'bank_only');assert.equal(r.filter(x=>x.status==='ledger_only').length,2)});
test('summary counts all exception categories',()=>{const s=C.summarize([{status:'matched'},{status:'bank_only'},{status:'ledger_only'}]);assert.equal(s.total,3);assert.equal(s.exceptions,2)});
console.log(`\n${passed} tests passed.`);
