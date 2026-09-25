import {useMemo,useState} from "react";
import {Link} from "react-router-dom";
import {FiFilter,FiRotateCcw,FiSearch,FiSliders,FiX} from "react-icons/fi";
import {opportunities,FX} from "../data/opportunities";
import OpportunityCard from "../components/OpportunityCard";
import Dropdown from "../components/Dropdown";
import Dialog from "../components/Dialog";
import useLocalStorage from "../hooks/useLocalStorage";

const statuses=["OPEN NOW","UPCOMING","APPLICATION WINDOW NOT YET ANNOUNCED","CLOSED","YEAR-ROUND/ROLLING","NOT APPLICABLE"];
const fieldOptions=[
  ["country","Country"],["region","Region"],["funding","Funding"],["status","Status"],["moi","MOI"],["work","Work experience"],["fresh","Fresh graduate"],["tuition","Tuition"],["proof","Proof of funds"],["deadline","Deadline"]
];
const labelize=v=>String(v).replaceAll("_"," ").toLowerCase().replace(/\b\w/g,m=>m.toUpperCase());

export default function Explorer({preset="all",title="Scholarship Explorer",description="Filter verified opportunities without mixing official facts and estimates.",browseMode}){
  const [filters,setFilters]=useState({q:"",country:"All",region:"All",funding:"All",status:"All",moi:"All",work:"All",fresh:"All",tuition:"All",proof:"All",deadline:"All",maxCostPKR:"",sort:"score"});
  const [favs,setFavs]=useLocalStorage("msmg-favorites",[]);
  const [comp,setComp]=useLocalStorage("msmg-compare",[]);
  const [advanced,setAdvanced]=useState(false);
  const [dialog,setDialog]=useState({open:false,title:"",description:"",type:"warning"});
  const countries=[...new Set(opportunities.map(o=>o.country))].sort();
  const regions=[...new Set(opportunities.map(o=>o.region))].sort();
  const fund=[...new Set(opportunities.map(o=>o.fundingType))].sort();
  const update=(k,v)=>setFilters(p=>Object.assign({},p,{[k]:v}));
  const reset=()=>setFilters({q:"",country:"All",region:"All",funding:"All",status:"All",moi:"All",work:"All",fresh:"All",tuition:"All",proof:"All",deadline:"All",maxCostPKR:"",sort:"score"});
  const activeCount=Object.entries(filters).filter(([k,v])=>!["q","maxCostPKR","sort"].includes(k)&&v!=="All").length+(filters.q?1:0)+(filters.maxCostPKR?1:0);

  const result=useMemo(()=>{
    let r=opportunities.slice();
    if(preset==="top10") r=r.slice().sort((a,b)=>b.score-a.score).slice(0,10);
    if(preset==="need") r=r.filter(o=>o.needBased==="YES");
    if(preset==="full") r=r.filter(o=>o.fullyFunded);
    if(preset==="tuition") r=r.filter(o=>o.tuitionAmount===0);
    if(preset==="lowcost") r=r.filter(o=>o.fundingType==="LOW-COST BACKUP");
    if(filters.q){const q=filters.q.toLowerCase();r=r.filter(o=>[o.university,o.program,o.scholarship,o.field,o.country,o.city].join(" ").toLowerCase().includes(q))}
    if(filters.country!=="All") r=r.filter(o=>o.country===filters.country);
    if(filters.region!=="All") r=r.filter(o=>o.region===filters.region);
    if(filters.funding!=="All") r=r.filter(o=>o.fundingType===filters.funding);
    if(filters.status!=="All") r=r.filter(o=>o.status===filters.status);
    if(filters.moi!=="All") r=r.filter(o=>o.moiAccepted===filters.moi);
    if(filters.work!=="All") r=r.filter(o=>o.noWorkExperience===filters.work);
    if(filters.fresh!=="All") r=r.filter(o=>o.freshGraduateEligible===filters.fresh);
    if(filters.tuition==="ZERO") r=r.filter(o=>o.tuitionAmount===0);
    if(filters.tuition==="KNOWN") r=r.filter(o=>o.tuitionAmount!==null);
    if(filters.tuition==="UNKNOWN") r=r.filter(o=>o.tuitionAmount===null);
    if(filters.proof!=="All") r=r.filter(o=>o.proof===filters.proof);
    if(filters.deadline==="KNOWN") r=r.filter(o=>Boolean(o.deadline));
    if(filters.deadline==="UNKNOWN") r=r.filter(o=>!o.deadline);
    if(filters.maxCostPKR!==""){const ceiling=Number(filters.maxCostPKR);if(Number.isFinite(ceiling))r=r.filter(o=>{const rate=FX[o.annualPersonal.currency];return rate?o.annualPersonal.amount*rate<=ceiling:false})}
    return r.sort((a,b)=>{
      if(filters.sort==="cost"){const ac=FX[a.annualPersonal.currency]?a.annualPersonal.amount*FX[a.annualPersonal.currency]:Number.MAX_SAFE_INTEGER;const bc=FX[b.annualPersonal.currency]?b.annualPersonal.amount*FX[b.annualPersonal.currency]:Number.MAX_SAFE_INTEGER;return ac-bc}
      if(filters.sort==="deadline")return(a.deadline||"9999-12-31").localeCompare(b.deadline||"9999-12-31");
      return b.score-a.score;
    });
  },[filters,preset]);

  const compareToggle=id=>{
    if(comp.includes(id)){setComp(x=>x.filter(v=>v!==id));return}
    if(comp.length>=4){
      setDialog({open:true,title:"Comparison limit reached",description:"You can compare up to four opportunities at once. Remove one from the comparison workspace before adding another.",type:"info"});
      return;
    }
    setComp(x=>x.concat(id));
  };
  const favoritesToggle=id=>setFavs(x=>x.includes(id)?x.filter(v=>v!==id):x.concat(id));

  const basicOptions={
    country:[{value:"All",label:"All countries"},...countries.map(v=>({value:v,label:v}))],
    region:[{value:"All",label:"All regions"},...regions.map(v=>({value:v,label:v}))],
    funding:[{value:"All",label:"All funding types"},...fund.map(v=>({value:v,label:labelize(v)}))],
    status:[{value:"All",label:"Any status"},...statuses.map(v=>({value:v,label:labelize(v)}))],
  };
  const advancedOptions={
    moi:["YES","NO","CONDITIONAL","UNKNOWN"],work:["YES","CONDITIONAL"],fresh:["YES","CONDITIONAL"],tuition:["ZERO","KNOWN","UNKNOWN"],proof:["CONDITIONAL"],deadline:["KNOWN","UNKNOWN"]
  };

  return <div className="space-y-6">
    <section><div className="eyebrow">{browseMode||"research explorer"}</div><h1 className="mt-2 text-3xl font-black">{title}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p></section>

    <section className="panel overflow-visible">
      <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2"><div className="filter-section-icon"><FiFilter size={15}/></div><div><div className="text-sm font-black">Find opportunities</div><div className="text-[11px] text-slate-400">{result.length} matches · {activeCount} active filters</div></div></div>
          <div className="flex items-center gap-2"><button className="btn-compact" onClick={()=>setAdvanced(x=>!x)}><FiSliders/>{advanced?"Hide filters":"More filters"}{activeCount>0&&<span className="filter-count">{activeCount}</span>}</button><button className="btn-compact" onClick={reset} disabled={activeCount===0}><FiRotateCcw/>Reset</button></div>
        </div>
      </div>
      <div className="p-3 sm:p-4">
        <div className="grid gap-2 sm:grid-cols-[minmax(220px,1.7fr)_minmax(150px,1fr)_minmax(150px,1fr)_auto]">
          <div className="relative"><FiSearch className="filter-search-icon"/><input className="input filter-search" value={filters.q} onChange={e=>update("q",e.target.value)} placeholder="Search university, programme or field"/></div>
          <Dropdown value={filters.country} options={basicOptions.country} onChange={v=>update("country",v)} placeholder="All countries"/>
          <Dropdown value={filters.funding} options={basicOptions.funding} onChange={v=>update("funding",v)} placeholder="All funding types"/>
          <Dropdown value={filters.sort} options={[{value:"score",label:"Research score"},{value:"cost",label:"Lowest personal cost"},{value:"deadline",label:"Nearest deadline"}]} onChange={v=>update("sort",v)} placeholder="Sort"/>
        </div>

        {advanced&&<div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <Dropdown value={filters.region} options={basicOptions.region} onChange={v=>update("region",v)} placeholder="All regions"/>
            <Dropdown value={filters.status} options={basicOptions.status} onChange={v=>update("status",v)} placeholder="Any status"/>
            {fieldOptions.slice(4).map(([key,label])=><Dropdown key={key} label={label} value={filters[key]} options={[{value:"All",label:"Any "+label.toLowerCase()},...advancedOptions[key].map(v=>({value:v,label:v==="ZERO"?"Zero tuition":v==="KNOWN"?"Known":"Unknown"===v?"Unknown":v}))]} onChange={v=>update(key,v)} placeholder={"Any "+label.toLowerCase()}/>)}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input className="input" inputMode="numeric" value={filters.maxCostPKR} onChange={e=>update("maxCostPKR",e.target.value)} placeholder="Maximum annual personal cost (PKR)"/>
            <div className="filter-note">Only known FX-plannable estimates are used by the PKR ceiling filter.</div>
          </div>
        </div>}
      </div>
    </section>

    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500"><span>{result.length} results · bookmarks {favs.length} · compare {comp.length}/4</span><Link to="/comparison" className="btn-secondary">Compare selected</Link></div>
    {result.length?<div className="grid gap-4 xl:grid-cols-2">{result.map(o=><OpportunityCard key={o.id} o={o} favorite={favs.includes(o.id)} compared={comp.includes(o.id)} onFavorite={favoritesToggle} onCompare={compareToggle}/>)}</div>:<div className="panel p-12 text-center"><h2 className="font-black">No verified records match</h2><p className="mt-2 text-sm text-slate-500">The dashboard does not add mock opportunities to fill empty filters.</p><button className="btn-secondary mt-5" onClick={reset}>Clear filters</button></div>}
    <Dialog open={dialog.open} onClose={()=>setDialog(x=>({...x,open:false}))} title={dialog.title} description={dialog.description} type={dialog.type}/>
  </div>;
}