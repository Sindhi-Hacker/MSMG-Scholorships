import {FiCheckCircle,FiDollarSign,FiBookOpen,FiShield,FiExternalLink} from "react-icons/fi";

function Row({label,value,kind}){
 return <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
  <div className="flex items-start gap-3">
   <div className="mt-0.5 text-slate-400"><FiCheckCircle/></div>
   <div className="min-w-0 flex-1">
    <div className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">{label}</div>
    <div className="mt-1 break-words text-sm font-semibold leading-6">{value}</div>
    {kind&&<div className="mt-1 break-words text-[11px] leading-5 text-slate-400">{kind}</div>}
   </div>
  </div>
 </div>
}

function Sources({opportunity:o}){
 const sources=o.sources||[];
 if(!sources.length && !o.verification) return null;
 return <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
  <div className="flex items-start gap-3">
   <FiShield className="mt-0.5 shrink-0 text-slate-500"/>
   <div className="min-w-0 flex-1">
    <div className="flex flex-wrap items-center gap-2">
     <b className="text-sm">Source verification</b>
     {o.verification?.status&&<span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">{o.verification.status}</span>}
    </div>
    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">NSP is a discovery source; published requirements are backed by official university/government/scholarship sources.{o.verification?.lastVerified?` Last verified ${o.verification.lastVerified}.`:""}</p>
    {sources.length>0&&<div className="mt-3 grid gap-2 sm:grid-cols-2">
      {sources.slice(0,6).map((s,i)=><a key={s.url||i} href={s.url} target="_blank" rel="noreferrer" className="group min-w-0 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950">
       <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs font-bold">{s.title||s.url}</span>
        <FiExternalLink className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5"/>
       </div>
       <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{s.type||"source"}</div>
      </a>)}
    </div>}
   </div>
  </div>
 </div>
}

export default function AdmissionRequirements({opportunity:o}){
 const requirements=o.requirements||{};
 const financialProof=o.proof?`${o.proof}${o.proofNote?` — ${o.proofNote}`:""}`:"Not explicitly stated in the tracked official evidence.";
 return <section className="panel min-w-0 p-5 lg:p-6">
  <div className="flex items-center gap-2"><FiBookOpen/><div><div className="eyebrow">Admission requirements</div><h2 className="mt-1 text-xl font-black">What you actually need before applying</h2></div></div>
  <div className="mt-5 grid min-w-0 gap-3 md:grid-cols-2">
   <Row label="Academic qualification" value={requirements.academic||o.academic?.join(" • ")||"Verify the programme-specific degree rule."}/>
   <Row label="English / language" value={`IELTS: ${o.ieltsRequired||"UNKNOWN"} · MOI: ${o.moiAccepted||"UNKNOWN"}`} kind={requirements.english||o.englishAlternative}/>
   <Row label="Work experience" value={o.noWorkExperience==="YES"?"No mandatory professional experience stated on the tracked route.":o.noWorkExperience==="CONDITIONAL"?"Depends on the route / CGPA / programme.":"Experience is required or strongly relevant on the tracked route."} kind={requirements.workExperience}/>
   <Row label="Nationality / eligibility" value={requirements.nationality||"Check the scholarship eligible-country list."}/>
   <Row label="Transcript / subject fit" value={o.transcript?.join(" • ")||"Programme-specific subject audit required."}/>
   <Row label="Documents" value={o.documents?.join(" • ")||"Passport, degree, transcript and programme-specific documents."}/>
   <Row label="Financial proof / bank balance" value={financialProof} kind="Separate this from tuition and scholarship cash. Academic admission, scholarship eligibility and immigration proof-of-funds are different checks."/>,
   <Row label="Application fee / tuition" value={o.tuitionDisplay||"Verify the current fee notice."} kind={o.country==="Italy"?"Padova’s international application process currently uses a EUR 60 application fee; programme-specific notices control the final route.":undefined}/>
  </div>
  {o.country==="Italy"&&<div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-400/20 dark:bg-amber-400/10"><div className="flex items-start gap-3"><FiDollarSign className="mt-0.5 shrink-0"/><div><b className="text-sm">Padova / Italy: bank-balance proof is a visa-stage issue, not a tuition figure</b><p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">The university’s academic admission criteria and Italy’s study-visa financial-availability rule should not be merged. Current official consular checklists can vary by mission, so the Italian mission responsible for Pakistan must be checked for the exact current amount and acceptable evidence.</p></div></div></div>}
  <Sources opportunity={o}/>
 </section>
}