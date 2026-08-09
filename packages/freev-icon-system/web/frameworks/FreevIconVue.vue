<script setup>
import "../freev-icon.js";
defineProps({app:{type:String,required:true},theme:{type:String,default:"inherit"},mode:{type:String,default:"auto"},variant:{type:String,default:"standard"},state:{type:String,default:"default"},badge:{type:String,default:"none"},size:{type:Number,default:128},animation:{type:String,default:"none"},motion:{type:String,default:"auto"},assetBase:String,label:String,interactive:Boolean,decorative:Boolean});
</script>
<template><freev-icon :app="app" :theme="theme" :mode="mode" :variant="variant" :state="state" :badge="badge" :size="size" :animation="animation" :motion="motion" :asset-base="assetBase" :label="label" :interactive="interactive?'':undefined" :decorative="decorative?'':undefined" @freev-activate="$emit('activate',$event)"/></template>
