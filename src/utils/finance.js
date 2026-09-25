import {FX,financeById} from "../data/opportunities";

const durationMonths=o=>{const m=String(o.duration||"").match(/(\d+)\s*(?:months?|mo)/i);if(m)return Number(m[1]);const y=String(o.duration||"").match(/(\d+)\s*years?/i);return y?Number(y[1])*12:12};

export function getFinancialModel(o){
  if(financeById[o.id]) return financeById[o.id];
  const months=durationMonths(o);
  const costs=[{label:"Estimated personal contribution",amount:o.annualPersonal?.amount??null,currency:o.annualPersonal?.currency||o.tuitionCurrency,frequency:"annual",payer:"student",status:"estimate"}];
  if(o.tuitionAmount===null&&!o.fullyFunded) costs.unshift({label:"Tuition",amount:null,currency:o.tuitionCurrency||o.annualPersonal?.currency,frequency:"annual",payer:"student",status:"unknown"});
  const cashFunding=o.stipendAmount===null?[{label:"Cash stipend / living allowance",amount:null,currency:o.stipendCurrency||o.annualPersonal?.currency,frequency:"monthly",months,status:"unknown"}]:[{label:"Published stipend",amount:o.stipendAmount,currency:o.stipendCurrency,frequency:"monthly",months,status:"known"}];
  const directFunding=o.fullyFunded?[{label:"Tuition",amount:o.tuitionAmount===0?0:null,currency:o.tuitionCurrency||o.annualPersonal?.currency,status:"covered"},{label:"Other scholarship benefits",amount:null,currency:o.tuitionCurrency||o.annualPersonal?.currency,status:"covered"}]:[];
  return{periodMonths:months,currency:o.annualPersonal?.currency||o.tuitionCurrency,costs,cashFunding,directFunding,notes:[o.annualPersonal?.note||"Fallback financial model derived from the research record."]};
}

export const frequencyMultiplier=(frequency,months)=>{
  if(frequency==="monthly") return months;
  if(frequency==="quarter") return months/3;
  if(frequency==="semester") return months/6;
  if(frequency==="annual") return months/12;
  return 1;
};

export const lineAmount=(line,months)=>{
  if(line.amount===null||line.amount===undefined)return null;
  const duration=line.months??months;
  return line.amount*frequencyMultiplier(line.frequency,duration);
};

export const pkrAmount=(amount,currency)=>{
  const rate=FX[currency];
  return amount===null||amount===undefined||!rate?null:amount*rate;
};

export function analyzeFinance(o,monthsOverride){
  const model=getFinancialModel(o);
  const months=monthsOverride||model.periodMonths||12;
  const costs=model.costs||[];
  const cash=model.cashFunding||[];
  const direct=model.directFunding||[];
  const studentCosts=costs.filter(x=>x.payer==="student"&&x.status!=="conditional");
  const conditionalCosts=costs.filter(x=>x.payer==="student"&&x.status==="conditional");
  const knownStudent=studentCosts.map(x=>({...x,total:lineAmount(x,months),pkr:lineAmount(x,months)==null?null:pkrAmount(lineAmount(x,months),x.currency)}));
  const knownCash=cash.map(x=>({...x,total:lineAmount(x,months),pkr:lineAmount(x,months)==null?null:pkrAmount(lineAmount(x,months),x.currency)}));
  const knownDirect=direct.map(x=>({...x,total:lineAmount(x,months),pkr:lineAmount(x,months)==null?null:pkrAmount(lineAmount(x,months),x.currency)}));
  const costPKR=knownStudent.filter(x=>x.pkr!==null).reduce((a,x)=>a+x.pkr,0);
  const cashPKR=knownCash.filter(x=>x.pkr!==null).reduce((a,x)=>a+x.pkr,0);
  const directPKR=knownDirect.filter(x=>x.pkr!==null&&x.total>0).reduce((a,x)=>a+x.pkr,0);
  const upfrontPKR=knownStudent.filter(x=>x.frequency==="one-time"&&x.pkr!==null).reduce((a,x)=>a+x.pkr,0);
  const unknownCost=studentCosts.some(x=>x.amount===null);
  const unknownCash=cash.some(x=>x.amount===null);
  const netPKR=unknownCost||unknownCash?null:costPKR-cashPKR;
  const coveragePct=costPKR>0?Math.round(Math.min(cashPKR/costPKR,1)*100):null;
  return{model,months,knownStudent,knownCash,knownDirect,conditionalCosts,costPKR,cashPKR,directPKR,upfrontPKR,unknownCost,unknownCash,netPKR,coveragePct};
}

export function formatMoney(amount,currency){
  if(amount===null||amount===undefined)return"UNKNOWN";
  return amount.toLocaleString(undefined,{maximumFractionDigits:2})+" "+currency;
}