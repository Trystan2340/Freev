export type FreevApp="CodeMaster_V2"|"StreamStudio_Pro"|"Freev_TaskFlow"|"Freev_Sketch_Pro"|"DataVault"|"Freev_Convert"|"PixelForge"|"ResumeMaster"|"Crop_Studio"|"CSV_Explorer"|"Markdown_Studio"|"QR_Studio"|"Signature_Studio";
export type FreevTheme="inherit"|"auto"|"cyan"|"purple"|"emerald"|"gold"|"ruby"|"rose"|"orange"|"graphite"|"ice";
export type FreevMode="auto"|"light"|"dark";
export type FreevVariant="standard"|"glass"|"transparent"|"monochrome-white"|"monochrome-black"|"monochrome-brand"|"small-simplified";
export type FreevState="default"|"hover"|"active"|"disabled"|"loading";
export type FreevBadge="none"|"new"|"update"|"beta"|"pro"|"notification"|"download";
export type FreevAnimation="none"|"auto"|"glow-code"|"pulse-play"|"flow-cards"|"draw-pencil"|"lock-vault"|"convert-swap"|"pixel-spark"|"resume-reveal";
export type FreevMotion="auto"|"on"|"off";
export interface FreevActivateDetail { app: FreevApp|string }
export interface FreevIconErrorDetail { app: FreevApp|string; error: unknown }
export interface FreevIconOptions {app:FreevApp;theme?:FreevTheme;mode?:FreevMode;variant?:FreevVariant;state?:FreevState;badge?:FreevBadge;size?:number;animation?:FreevAnimation;motion?:FreevMotion;label?:string;decorative?:boolean;interactive?:boolean;assetBase?:string}
export interface FreevIconElement extends HTMLElement { render(): Promise<void>; }
export declare class FreevIcon extends HTMLElement { render(): Promise<void>; }
export declare function clearFreevIconCaches(): void;
export declare function getFreevIconCacheStats(): {images:number;renders:number;renderBytes:number;maxBytes:number};
export declare const THEMES: Record<string,[string,string]>;
declare global { interface HTMLElementTagNameMap { "freev-icon": FreevIconElement } }
