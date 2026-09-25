import{useState}from"react";import{opportunities}from"../data/opportunities";import Dropdown from"../components/Dropdown";import FinancialBreakdown from"../components/FinancialBreakdown";import{FiRefreshCw}from"react-icons/fi";

export default function Budget(){
  const[id,setId]=useState(opportunities[0].id),[months,setMonths]=useState(12),[custom,setCustom]=useState(""),[reserve,setReserve]=useState("");
  const o=opportunities.find(x=>x.id===id);
  const modelMonths=months;
  const resetInputs=()=>{setCustom("");setReserve("")};
  const baseMonthly=o?.annualLiving?.amount&&o.annualLiving.amount>0?o.annualLiving.amount/(String(o.annualLiving.note||"").includes("monthly")?1:12):null;
  return <div className="space-y-6">
    <section>
      <div className="eyebrow">Financial planning</div>
      <h1 className="mt-2 text-3xl font-black">See what you pay, what you receive, and what the scholarship covers.</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Every figure stays in its original currency first, then converts to a PKR planning estimate. Scholarship cash is funding received, not employment revenue.</p>
    </section>

    <section className="panel p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div><div className="text-sm font-black">Build your scenario</div><div className="text-xs text-slate-400">Change the period and living assumptions without changing the research record.</div></div>
        <button className="btn-compact" onClick={resetInputs}><FiRefreshCw/>Reset scenario</button>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[1.8fr_.7fr_1fr_1fr]">
        <Dropdown label="Opportunity" value={id} onChange={setId} options={opportunities.map(x=>({value:x.id,label:x.university+" — "+x.program}))} searchable/>
        <Dropdown label="Period" value={String(modelMonths)} onChange={v=>setMonths(Number(v))} options={[{value:"12",label:"12 months"},{value:"18",label:"18 months"},{value:"24",label:"24 months"},{value:"36",label:"36 months"}]}/>
        <div><label className="filter-label">Monthly living cost</label><input className="input" type="number" min="0" value={custom} onChange={e=>setCustom(e.target.value)} placeholder={baseMonthly?String(Math.round(baseMonthly)):"Use research estimate"}/></div>
        <div><label className="filter-label">Extra safety reserve</label><input className="input" type="number" min="0" value={reserve} onChange={e=>setReserve(e.target.value)} placeholder="0"/></div>
      </div>
    </section>

    <section className="panel p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><div className="eyebrow">Executive financial view</div><h2 className="mt-1 text-xl font-black">Your personal cash position over {modelMonths} months</h2></div>
        <div className="text-right text-[11px] text-slate-400">FX planning snapshot · 25 Sep 2026</div>
      </div>
      <FinancialBreakdown opportunity={o} months={modelMonths} monthlyLivingOverride={custom===""?undefined:Number(custom)} additionalOneTimeCost={reserve===""?0:Number(reserve)}/>
    </section>

    <section className="grid gap-4 md:grid-cols-3">
      <div className="panel p-5"><div className="eyebrow">Core meaning</div><p className="mt-2 text-sm leading-6 text-slate-500">“You pay” counts known student-paid costs. “Cash received” counts published scholarship money that reaches the student. “Direct benefits” counts published tuition or other benefits paid separately.</p></div>
      <div className="panel p-5"><div className="eyebrow">Use for visa planning</div><p className="mt-2 text-sm leading-6 text-slate-500">Keep upfront visa, travel, deposit and proof-of-funds requirements separate from long-run scholarship value. A fully funded award can still require money before arrival.</p></div>
      <div className="panel p-5"><div className="eyebrow">Confidence rule</div><p className="mt-2 text-sm leading-6 text-slate-500">Unknown figures are never converted to zero. They remain visibly unknown until an official call, university fee notice, or award letter provides the value.</p></div>
    </section>
  </div>;
}