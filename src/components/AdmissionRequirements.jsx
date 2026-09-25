import {FiCheckCircle,FiDollarSign,FiFileText,FiGlobe,FiBookOpen} from "react-icons/fi";
import {FX} from "../data/opportunities";

function Row({label,value,kind}){return <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><div className="flex items-start gap-3"><div className="mt-0.5 text-slate-400"><FiCheckCircle/></div><div className="min-w-0 flex-1"><div className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">{label}</div><div className="mt-1 text-sm font-semibold leading-6">{value}</div>{kind&&<div className="mt-1 text-[11px] text-slate-400">{kind}</div>}</div></div></div>}

export default function AdmissionRequirements({opportunity:o}){
 const fx=FX.EUR;
 const visa=o.country==="Italy"?{title:"Visa / proof of funds",value:"EUR 10,179.85 per academic year",kind:"Current 2026/27 Italian consular reference. This is immigration financial capacity, not tuition paid to the university."}:null;
 return <section className="panel p-5 lg:p-6">
  <div className="flex items-center gap-2"><FiBookOpen/><div><div className="eyebrow">Admission requirements</div><h2 className="mt-1 text-xl font-black">What you actually need before applying</h2></div></div>
  <div className="mt-5 grid gap-3 md:grid-cols-2">
   <Row label="Academic qualification" value={o.academic.join(" • ")}/>
   <Row label="English / language" value={"IELTS: "+o.ieltsRequired+" · MOI: "+o.moiAccepted} kind={o.englishAlternative}/>
   <Row label="Work experience" value={o.noWorkExperience==="YES"?"No mandatory professional experience stated on the tracked route.":o.noWorkExperience==="CONDITIONAL"?"Depends on the route / CGPA / programme.":"Experience is required or strongly relevant on the tracked route."}/>
   <Row label="Transcript / subject fit" value={o.transcript.join(" • ")}/>
   <Row label="Documents" value={o.documents.join(" • ")}/>
   <Row label="Application fee / tuition" value={o.tuitionDisplay} kind={o.country==="Italy"?"Padova international applications generally require a EUR 60 application fee; programme-specific notices control the final fee route.":undefined}/>
   {visa&&<Row label={visa.title} value={visa.value} kind={visa.kind}/>}
  </div>
  {o.country==="Italy"&&<div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-400/20 dark:bg-amber-400/10"><div className="flex items-start gap-3"><FiDollarSign className="mt-0.5 shrink-0"/><div><b className="text-sm">Do not confuse proof-of-funds with university tuition</b><p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">For Italy, the financial-availability rule belongs to the study-visa process. The university can approve the academic application while the visa process separately checks financial resources and accommodation.</p></div></div></div>}
 </section>
}