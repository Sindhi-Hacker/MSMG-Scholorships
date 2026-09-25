import {useEffect,useRef,useState} from "react";
import {FiCheck,FiChevronDown} from "react-icons/fi";

export default function Dropdown({label,value,options,onChange,placeholder,searchable=false,className=""}){
  const [open,setOpen]=useState(false),[query,setQuery]=useState("");
  const ref=useRef(null);
  useEffect(()=>{
    const close=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)};
    const key=e=>{if(e.key==="Escape")setOpen(false)};
    document.addEventListener("mousedown",close);document.addEventListener("keydown",key);
    return()=>{document.removeEventListener("mousedown",close);document.removeEventListener("keydown",key)};
  },[]);
  const filtered=options.filter(o=>String(o.label??o.value).toLowerCase().includes(query.toLowerCase()));
  const selected=options.find(o=>String(o.value)===String(value));
  return <div className={"relative "+className} ref={ref}>
    {label&&<label className="filter-label">{label}</label>}
    <button type="button" className={"dropdown-trigger "+(open?"dropdown-trigger-open":"")} onClick={()=>{setOpen(x=>!x);setQuery("")} } aria-haspopup="listbox" aria-expanded={open}>
      <span className={"truncate "+(!selected?"text-slate-400":"")}>{selected?.label??placeholder??"Select option"}</span>
      <FiChevronDown className={"shrink-0 transition-transform "+(open?"rotate-180":"")} size={16}/>
    </button>
    {open&&<div className="dropdown-menu" role="listbox">
      {searchable&&<input autoFocus className="dropdown-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search options..." />}
      <div className="max-h-64 overflow-y-auto p-1.5">
        {filtered.length?filtered.map(o=><button type="button" key={String(o.value)} role="option" aria-selected={String(o.value)===String(value)} className={"dropdown-option "+(String(o.value)===String(value)?"dropdown-option-selected":"")} onClick={()=>{onChange(o.value);setOpen(false);setQuery("")}}>
          <span className="truncate">{o.label??o.value}</span>{String(o.value)===String(value)&&<FiCheck className="shrink-0" size={15}/>}
        </button>):<div className="px-3 py-5 text-center text-xs text-slate-400">No matching options</div>}
      </div>
    </div>}
  </div>
}