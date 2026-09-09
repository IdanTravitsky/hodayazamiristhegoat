'use client';
import { useEffect, useRef, useState } from 'react';
import { Slider } from '@/components/ui/slider';

type Player={playVideo:()=>void;pauseVideo:()=>void;setVolume:(v:number)=>void;destroy:()=>void;getIframe:()=>HTMLIFrameElement};
type YTApi={Player:new(element:HTMLElement,config:Record<string,unknown>)=>Player};
type YTWindow=Window&{YT?:YTApi;onYouTubeIframeAPIReady?:()=>void};
let loading:Promise<YTApi>|null=null;
function loadPlayer():Promise<YTApi>{
 const w=window as YTWindow;
 if(w.YT?.Player)return Promise.resolve(w.YT);
 if(loading)return loading;
 loading=new Promise((resolve,reject)=>{
  const previous=w.onYouTubeIframeAPIReady,script=document.createElement('script');
  const clean=()=>{clearTimeout(timeout);if(w.onYouTubeIframeAPIReady===onReady)w.onYouTubeIframeAPIReady=previous;};
  const fail=()=>{clean();script.remove();loading=null;reject(new Error('YouTube could not connect.'));};
  const onReady=()=>{clean();if(w.YT?.Player)resolve(w.YT);else fail();previous?.();};
  const timeout=setTimeout(fail,16000);
  w.onYouTubeIframeAPIReady=onReady;script.src='https://www.youtube.com/iframe_api';script.async=true;script.onerror=fail;document.head.appendChild(script);
 });
 return loading;
}

export default function Soundtrack({active,onActiveChange,onPlayback}:{active:boolean;onActiveChange:(active:boolean)=>void;onPlayback:(playing:boolean)=>void}){
 const host=useRef<HTMLDivElement>(null),player=useRef<Player|null>(null),wantPlay=useRef(active),volumeRef=useRef(18),playerReady=useRef(false),playerState=useRef(-1);
 const [mounted,setMounted]=useState(false),[attempt,setAttempt]=useState(0),[status,setStatus]=useState('Play it quietly while you look around.'),[volume,setVolume]=useState(18),[failed,setFailed]=useState(false),[playing,setPlaying]=useState(false);
 const callbacks=useRef({onActiveChange,onPlayback});callbacks.current={onActiveChange,onPlayback};wantPlay.current=active;
 useEffect(()=>{
  if(active){setMounted(true);if(failed){setFailed(false);setAttempt(v=>v+1);return;}}
  if(!playerReady.current||!player.current)return;
  if(active&&playerState.current!==1&&playerState.current!==3)player.current.playVideo();
  else if(!active&&(playerState.current===1||playerState.current===3))player.current.pauseVideo();
 },[active,failed]);
 useEffect(()=>{
  if(!mounted||!host.current)return;
  let disposed=false;const container=host.current;
  playerReady.current=false;playerState.current=-1;setStatus('Getting the music ready…');setFailed(false);
  const sync=(isPlaying:boolean,intent?:boolean)=>{setPlaying(isPlaying);callbacks.current.onPlayback(isPlaying);if(intent!==undefined){wantPlay.current=intent;callbacks.current.onActiveChange(intent);}};
  const fail=()=>{if(disposed)return;clearTimeout(readyTimeout);playerReady.current=false;setFailed(true);setStatus('The music couldn’t connect. Try again, or open the official video.');sync(false,false);};
  const readyTimeout=setTimeout(fail,20000);
  const mount=document.createElement('div');container.appendChild(mount);
  loadPlayer().then(api=>{
   if(disposed)return;
   player.current=new api.Player(mount,{width:'100%',height:200,host:'https://www.youtube-nocookie.com',videoId:'aGSKrC7dGcY',playerVars:{autoplay:0,controls:1,playsinline:1,loop:1,playlist:'aGSKrC7dGcY',origin:window.location.origin,rel:0},events:{
    onReady:({target}:{target:Player})=>{if(disposed)return;clearTimeout(readyTimeout);playerReady.current=true;setFailed(false);target.getIframe().title='Depeche Mode — Enjoy the Silence, official music video';target.setVolume(volumeRef.current);setStatus('Ready. Tap play to listen.');if(wantPlay.current)target.playVideo();},
    onStateChange:({data}:{data:number})=>{
     if(disposed)return;playerState.current=data;
     if(data===1){sync(true,true);setStatus('Playing softly.');}
     else if(data===2){sync(false,false);setStatus('Paused.');}
     else if(data===3){sync(false);setStatus('Buffering…');}
     else if(data===0){sync(false);setStatus('One more listen.');}
    },
    onAutoplayBlocked:()=>{if(disposed)return;sync(false,false);setStatus('Tap play on the video to begin.');},
    onError:fail,
   }});
  }).catch(fail);
  return()=>{disposed=true;clearTimeout(readyTimeout);playerReady.current=false;player.current?.destroy();player.current=null;container.replaceChildren();};
 },[mounted,attempt]);
 function retry(){wantPlay.current=true;setFailed(false);setMounted(true);setAttempt(v=>v+1);onActiveChange(true);}
 function toggle(){if(failed){retry();return;}onActiveChange(!active);}
 function close(){wantPlay.current=false;onActiveChange(false);onPlayback(false);setPlaying(false);setMounted(false);setFailed(false);setStatus('Play it quietly while you look around.');}
 return <section className={'soundtrack '+(mounted?'soundtrack-open':'')} aria-label="Background music">
  <div className="soundtrack-caption"><button className={'pixel-record '+(playing?'spinning':'')} aria-label={active?'Pause Enjoy the Silence':'Play Enjoy the Silence softly'} onClick={toggle}><span/><i/></button><div><span className="handwritten">something to listen to</span><h2>Enjoy the Silence</h2><p>Depeche Mode <span>·</span> a little quieter, for here.</p></div><button className="song-toggle" onClick={toggle}>{failed?'Retry':active?'Pause':'Play softly'}<span aria-hidden="true">{active?'Ⅱ':'▷'}</span></button></div>
  {mounted&&<div className="soundtrack-expanded"><div className="youtube-mount" ref={host}/><div className="soundtrack-controls"><p role="status">{status}</p>{failed&&<button className="music-retry" onClick={retry}>Retry music</button>}<div className="volume-row"><span>Volume</span><Slider className="song-volume" aria-label="Background music volume" value={[volume]} min={0} max={100} onValueChange={v=>{const next=Array.isArray(v)?v[0]:v;setVolume(next);volumeRef.current=next;if(playerReady.current)player.current?.setVolume(next);}}/><output>{volume}%</output></div><a href="https://www.youtube.com/watch?v=aGSKrC7dGcY" target="_blank" rel="noreferrer">Official video on YouTube ↗</a><button className="stop-music" onClick={close}>Stop & put the record away</button></div></div>}
 </section>;
}
