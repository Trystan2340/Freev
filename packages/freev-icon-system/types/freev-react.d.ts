import type * as React from "react";
import type {FreevApp,FreevTheme,FreevMode,FreevVariant,FreevState,FreevBadge,FreevAnimation,FreevMotion,FreevActivateDetail} from "./freev-icon.js";
export interface FreevIconReactProps extends Omit<React.HTMLAttributes<HTMLElement>,"onClick"> {
 app:FreevApp; theme?:FreevTheme; mode?:FreevMode; variant?:FreevVariant; iconStyle?:FreevVariant; state?:FreevState; badge?:FreevBadge; size?:number; animation?:FreevAnimation; motion?:FreevMotion; label?:string; decorative?:boolean; interactive?:boolean; assetBase?:string; onActivate?:(event:CustomEvent<FreevActivateDetail>)=>void; onClick?:React.MouseEventHandler<HTMLElement>;
}
export declare function FreevIcon(props:FreevIconReactProps): React.ReactElement;
