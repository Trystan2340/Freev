import React from "react";
import "../freev-icon.js";
export function FreevIcon({app,theme="inherit",mode="auto",variant="standard",iconStyle,state="default",badge="none",size=128,animation="none",label,decorative=false,interactive=false,motion="auto",assetBase,onActivate,...rest}){
  const ref=React.useRef(null);
  React.useEffect(()=>{const el=ref.current;if(!el||!onActivate)return;const fn=e=>onActivate(e);el.addEventListener("freev-activate",fn);return()=>el.removeEventListener("freev-activate",fn)},[onActivate]);
  return React.createElement("freev-icon",{ref,app,theme,mode,variant:iconStyle||variant,state,badge,size,animation,label,motion,...(assetBase?{"asset-base":assetBase}:{}),...(decorative?{decorative:""}:{}),...(interactive?{interactive:""}:{}),...rest});
}
