import type {DefineComponent,PropType} from "vue";
import type {FreevApp,FreevTheme,FreevMode,FreevVariant,FreevState,FreevBadge,FreevAnimation,FreevMotion} from "./freev-icon.js";
export interface FreevIconVueProps {app:FreevApp;theme?:FreevTheme;mode?:FreevMode;variant?:FreevVariant;state?:FreevState;badge?:FreevBadge;size?:number;animation?:FreevAnimation;motion?:FreevMotion;assetBase?:string;label?:string;interactive?:boolean;decorative?:boolean}
export declare const FreevIcon: DefineComponent<FreevIconVueProps,{},any>;
export default FreevIcon;
