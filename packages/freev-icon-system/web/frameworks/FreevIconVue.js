import {defineComponent,h} from "vue";
import "../freev-icon.js";
export const FreevIcon=defineComponent({
  name:"FreevIcon",inheritAttrs:false,emits:["activate"],
  props:{app:{type:String,required:true},theme:{type:String,default:"inherit"},mode:{type:String,default:"auto"},variant:{type:String,default:"standard"},state:{type:String,default:"default"},badge:{type:String,default:"none"},size:{type:Number,default:128},animation:{type:String,default:"none"},motion:{type:String,default:"auto"},assetBase:String,label:String,interactive:Boolean,decorative:Boolean},
  setup(props,{attrs,emit}){return()=>h("freev-icon",{...attrs,app:props.app,theme:props.theme,mode:props.mode,variant:props.variant,state:props.state,badge:props.badge,size:props.size,animation:props.animation,motion:props.motion,"asset-base":props.assetBase,label:props.label,interactive:props.interactive?"":undefined,decorative:props.decorative?"":undefined,onFreevActivate:e=>emit("activate",e)})}
});
export default FreevIcon;
