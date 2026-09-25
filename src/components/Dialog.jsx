import {useEffect} from "react";
import {createPortal} from "react-dom";
import {FiAlertTriangle,FiCheckCircle,FiInfo,FiX} from "react-icons/fi";

const icons={warning:FiAlertTriangle,success:FiCheckCircle,info:FiInfo};

export default function Dialog({open,onClose,title,description,type="warning",children,actions=true}){
  useEffect(()=>{
    if(!open)return;
    const onKey=e=>{if(e.key==="Escape")onClose?.()};
    document.addEventListener("keydown",onKey);
    const previous=document.body.style.overflow;
    document.body.style.overflow="hidden";
    return()=>{document.removeEventListener("keydown",onKey);document.body.style.overflow=previous};
  },[open,onClose]);
  if(!open)return null;
  const Icon=icons[type]||FiInfo;
  return createPortal(
    <div className="dialog-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose?.()}}>
      <div className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby={description?"dialog-description":undefined}>
        <div className="flex items-start justify-between gap-4">
          <div className={"dialog-icon "+(type==="warning"?"dialog-icon-warning":type==="success"?"dialog-icon-success":"dialog-icon-info")}><Icon size={19}/></div>
          <button className="icon-btn shrink-0" onClick={onClose} aria-label="Close dialog"><FiX/></button>
        </div>
        <div className="mt-4">
          <h2 id="dialog-title" className="text-lg font-black tracking-tight">{title}</h2>
          {description&&<p id="dialog-description" className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>}
          {children&&<div className="mt-4">{children}</div>}
        </div>
        {actions&&<div className="mt-6 flex justify-end gap-2"><button className="btn-primary" onClick={onClose}>Close</button></div>}
      </div>
    </div>,
    document.body
  );
}