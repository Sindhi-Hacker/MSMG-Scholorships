import {useMemo,useState} from "react";
import {Link} from "react-router-dom";
import {opportunities,FX} from "../data/opportunities";
import OpportunityCard from "../components/OpportunityCard";
import useLocalStorage from "../hooks/useLocalStorage";

const statuses=["OPEN NOW","UPCOMING","APPLICATION WINDOW NOT YET ANNOUNCED","CLOSED","YEAR-ROUND/ROLLING","NOT APPLICABLE"];

export default function Explorer({preset="all",title="Scholarship Explorer",description="Filter verified opportunities without mixing official facts and estimates.",browseMode}){
  const [filters,setFilters]=useState({q:"",country:"All",region:"All",funding:"All",status:"All",moi:"All",work:"All",fresh:"All",tuition:"All",proof:"All",deadline:"All",maxCostPKR:"",sort:"score"});
  const [favs,setFavs]=useLocalStorage("msmg-favorites",[]);
  const [comp,setComp]=useLocalStorage("msmg-compare",[]);
  const countries=[...new Set(opportunities.map(o=>o.country))].sort();
  const regions=[...new Set(opportunities.map(o=>o.region))].sort();
  const fund=[...new Set(opportunities.map(o=>o.fundingType))].sort();
  const update=(k,v)=>setFilters(p=>Object.assign({},p,{[k]:v}));
  const reset=()=>setFilters({q:"",country:"All",region:"All",funding:"All",status:"All",moi:"All",work:"All",fresh:"All",tuition:"All",proof:"All",deadline:"All",maxCostPKR:"",sort:"score"});

  const result=useMemo(()=>{
    let r=opportunities.slice();
    if(preset==="top10") r=r.slice().sort((a,b)=>b.score-a.score).slice(0,10);
    if(preset==="need") r=r.filter(o=>o.needBased==="YES");
    if(preset==="full") r=r.filter(o=>o.fullyFunded);
    if(preset==="tuition") r=r.filter(o=>o.tuitionAmount===0);
    if(preset==="lowcost") r=r.filter(o=>o.fundingType==="LOW-COST BACKUP");

    if(filters.q){
      const q=filters.q.toLowerCase();
      r=r.filter(o=>[o.university,o.program,o.scholarship,o.field,o.country,o.city].join(" ").toLowerCase().includes(q));
    }
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
    if(filters.maxCostPKR!==""){
      const ceiling=Number(filters.maxCostPKR);
      if(Number.isFinite(ceiling)) r=r.filter(o=>{
        const rate=FX[o.annualPersonal.currency];
        return rate ? o.annualPersonal.amount*rate <= ceiling : false;
      });
    }

    return r.sort((a,b)=>{
      if(filters.sort==="cost"){
        const ac=FX[a.annualPersonal.currency]?a.annualPersonal.amount*FX[a.annualPersonal.currency]:Number.MAX_SAFE_INTEGER;
        const bc=FX[b.annualPersonal.currency]?b.annualPersonal.amount*FX[b.annualPersonal.currency]:Number.MAX_SAFE_INTEGER;
        return ac-bc;
      }
      if(filters.sort==="deadline") return (a.deadline||"9999-12-31").localeCompare(b.deadline||"9999-12-31");
      return b.score-a.score;
    });
  },[filters,preset]);

  const toggle=(setter,id)=>setter(x=>x.includes(id)?x.filter(v=>v!==id):x.length<4?x.concat(id):x);

  return <div className="space-y-6">
    <section><div className="eyebrow">{browseMode||"research explorer"}</div><h1 className="mt-2 text-3xl font-black">{title}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p></section>

    <div className="panel p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <input className="input xl:col-span-2" value={filters.q} onChange={e=>update("q",e.target.value)} placeholder="Search university, programme, field or scholarship"/>
        {[
          ["country",countries],["region",regions],["funding",fund],["status",statuses],
          ["moi",["YES","NO","CONDITIONAL","UNKNOWN"]],
          ["work",["YES","CONDITIONAL"]],
          ["fresh",["YES","CONDITIONAL"]],
          ["tuition",["ZERO","KNOWN","UNKNOWN"]],
          ["proof",["CONDITIONAL"]],
          ["deadline",["KNOWN","UNKNOWN"]]
        ].map(([key,values])=><select className="input" key={key} value={filters[key]} onChange={e=>update(key,e.target.value)}><option value="All">{key}: All</option>{values.map(v=><option key={v}>{v}</option>)}</select>)}
        <input className="input" inputMode="numeric" value={filters.maxCostPKR} onChange={e=>update("maxCostPKR",e.target.value)} placeholder="Max annual personal cost, PKR"/>
        <select className="input" value={filters.sort} onChange={e=>update("sort",e.target.value)}><option value="score">Sort: research score</option><option value="cost">Sort: lowest personal estimate</option><option value="deadline">Sort: nearest deadline</option></select>
        <button className="btn-secondary" onClick={reset}>Reset filters</button>
      </div>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500"><span>{result.length} results · bookmarks {favs.length} · compare {comp.length}/4</span><Link to="/comparison" className="btn-secondary">Compare selected</Link></div>

    {result.length?<div className="grid gap-4 xl:grid-cols-2">{result.map(o=><OpportunityCard key={o.id} o={o} favorite={favs.includes(o.id)} compared={comp.includes(o.id)} onFavorite={id=>toggle(setFavs,id)} onCompare={id=>toggle(setComp,id)}/>)}</div>:<div className="panel p-12 text-center"><h2 className="font-black">No verified records match</h2><p className="mt-2 text-sm text-slate-500">The dashboard does not add mock opportunities to fill empty filters.</p></div>}
  </div>;
}