(function(root){
  function cents(value){
    if(typeof value==='number') return Math.round(value*100);
    let s=String(value??'').trim().replace(/[R$\s]/g,'');
    if(!s) return NaN;
    if(s.includes(',') && s.includes('.')) s=s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');
    else if(s.includes(',')) s=s.replace(',','.');
    const n=Number(s); return Number.isFinite(n)?Math.round(n*100):NaN;
  }
  function normalizeRef(v){return String(v??'').trim().toUpperCase().replace(/\s+/g,'');}
  function parseCSV(text){
    const rows=[]; let row=[],cell='',quoted=false;
    for(let i=0;i<text.length;i++){
      const c=text[i];
      if(quoted){if(c==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(c==='"')quoted=false;else cell+=c;}
      else if(c==='"')quoted=true;
      else if(c===','){row.push(cell);cell='';}
      else if(c==='\n'){row.push(cell.replace(/\r$/,''));if(row.some(x=>x.trim()!==''))rows.push(row);row=[];cell='';}
      else cell+=c;
    }
    if(cell.length||row.length){row.push(cell.replace(/\r$/,''));if(row.some(x=>x.trim()!==''))rows.push(row);}
    if(!rows.length)return [];
    const headers=rows.shift().map(h=>h.trim().toLowerCase().replace(/[ _-]+/g,''));
    const alias={reference:['reference','ref','transactionid','transactionreference','id'],date:['date','transactiondate','bookingdate'],description:['description','memo','narrative','details'],amount:['amount','value','transactionamount','netamount'],status:['status','state']};
    const indexes={}; for(const [key,opts] of Object.entries(alias)) indexes[key]=headers.findIndex(h=>opts.includes(h));
    if(indexes.reference<0||indexes.amount<0) throw new Error('CSV must include reference (or id) and amount columns.');
    return rows.map((r,i)=>({reference:r[indexes.reference]||'',date:indexes.date>=0?r[indexes.date]||'':'',description:indexes.description>=0?r[indexes.description]||'':'',amount: r[indexes.amount]||'',status:indexes.status>=0?r[indexes.status]||'':'',_row:i+2}));
  }
  function reconcile(bank,ledger){
    const b=(bank||[]).map((x,i)=>({...x,_side:'bank',_id:'b'+i,_cents:cents(x.amount),_ref:normalizeRef(x.reference)}));
    const l=(ledger||[]).map((x,i)=>({...x,_side:'ledger',_id:'l'+i,_cents:cents(x.amount),_ref:normalizeRef(x.reference)}));
    const used=new Set(),out=[];
    for(const br of b){
      const candidates=l.filter(x=>!used.has(x._id)&&x._ref===br._ref&&br._ref);
      if(candidates.length===1){const lr=candidates[0];used.add(lr._id);out.push({id:br._id+'-'+lr._id,status:br._cents===lr._cents?'matched':'amount_mismatch',reference:br.reference||lr.reference,bank:br,ledger:lr,differenceCents:(Number.isFinite(br._cents)&&Number.isFinite(lr._cents))?br._cents-lr._cents:null});}
      else out.push({id:br._id,status:candidates.length>1?'ambiguous_reference':'bank_only',reference:br.reference,bank:br,ledger:null,differenceCents:null});
    }
    for(const lr of l){if(!used.has(lr._id))out.push({id:lr._id,status:'ledger_only',reference:lr.reference,bank:null,ledger:lr,differenceCents:null});}
    return out;
  }
  function summarize(rows){const s={total:rows.length,matched:0,amount_mismatch:0,bank_only:0,ledger_only:0,ambiguous_reference:0};rows.forEach(r=>s[r.status]=(s[r.status]||0)+1);s.exceptions=s.total-s.matched;return s;}
  const api={cents,normalizeRef,parseCSV,reconcile,summarize};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.LedgerCore=api;
})(typeof window!=='undefined'?window:null);
