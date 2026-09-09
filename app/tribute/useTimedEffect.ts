import { useCallback, useEffect, useRef, useState } from 'react';

/** Restarting an effect cancels its earlier expiry. */
export function useTimedEffect(duration:number){
 const [active,setActive]=useState(false),[sequence,setSequence]=useState(0);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const stop=useCallback(()=>{if(timer.current)clearTimeout(timer.current);timer.current=null;setActive(false);},[]);
 const start=useCallback(()=>{
  if(timer.current)clearTimeout(timer.current);
  setActive(true);setSequence(n=>n+1);
  timer.current=setTimeout(()=>{timer.current=null;setActive(false);},duration);
 },[duration]);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 return {active,start,stop,sequence};
}
