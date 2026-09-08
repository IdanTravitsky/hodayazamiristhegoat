'use client';
import { useEffect, useRef, useState } from 'react';
import { Slider } from '@/components/ui/slider';

type Player={playVideo:()=>void;pauseVideo:()=>void;setVolume:(v:number)=>void;destroy:()=>void;getIframe:()=>HTMLIFrameElement};
type YTApi={Player:new(element:HTMLElement,config:Record<string,unknown>)=>Player};
type YTWindow=Window&{YT?:YTApi;onYouTubeIframeAPIReady?:()=>void};
let loading:Promise<YTApi>|null=null;
function loadPlayer():Promise<YTApi>{
 const w=window as YTWindow;if(w.YT?.Player)return Promise.resolve(w.YT);
 if(loading)return loading;
 loading=new Promise((resolve,reject)=>{const previous=w.onYouTubeIframeAPIReady;const timeout=setTimeout(()=>{loading=null;reject(new Error('The music player is taking a little too long.'))},16000);w.onYouTubeIframeAPIReady=()=>{previous?.();clearTimeout(timeout);if(w.YT)resolve(w.YT)};const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;script.onerror=()=>{clearTimeout(timeout);loading=null;reject(new Error('The music player could not connect.'))};document.head.appendChild(script)});
 return loading;
}
export default function Soundtrack({active,onActiveChange,onPlayback}:{active:boolean;onActiveChange:(active:boolean)=>void;onPlayback:(playing:boolean)=>void}){
 const host=useRef<HTMLDivElement>(null),player=useRef<Player|null>(null),wantPlay=useRef(active),volumeRef=useRef(18);
 const [mounted,setMounted]=useState(false),[status,setStatus]=useState('Play it quietly while you look around.'),[volume,setVolume]=useState(18),[failed,setFailed]=useState(false),[playing,setPlaying]=useState(false);
 const callbacks=useRef({onActiveChange,onPlayback});callbacks.current={onActiveChange,onPlayback};wantPlay.current=active;
 useEffect(()=>{if(active)setMounted(true);if(player.current){if(active)player.current.playVideo();else player.current.pauseVideo()}},[active]);
 useEffect(()=>{if(!mounted||!host.current)return;let disposed=false;setStatus('Getting the music ready…');setFailed(false);
 const mount=document.createElement('div');host.current.appendChild(mount);
 loadPlayer().then(api=>{if(disposed)return;player.current=new api.Player(mount,{width:'100%',height:200,host:'https://www.youtube-nocookie.com',videoId:'aGSKrC7dGcY',playerVars:{autoplay:0,controls:1,playsinline:1,loop:1,playlist:'aGSKrC7dGcY',origin:window.location.origin,rel:0},events:{onReady:({target}:{target:Player})=>{if(disposed)return;target.getIframe().title='Depeche Mode — Enjoy the Silence, official music video';target.setVolume(volumeRef.current);setStatus('Ready. Press play if your browser needs a tap.');if(wantPlay.current)target.playVideo()},onStateChange:({data}:{data:number})=>{if(disposed)return;const nowPlaying=data===1;setPlaying(nowPlaying);callbacks.current.onPlayback(nowPlaying);if(data===1)setStatus('Playing softly. Stay a while.');else if(data===2)setStatus('Paused. No rush.');else if(data===3)setStatus('Just a moment…');else if(data===0)setStatus('One more listen.');},onAutoplayBlocked:()=>{setStatus('One little tap on the video’s play button to begin.');setPlaying(false)},onError:()=>{if(disposed)return;setFailed(true);setStatus('YouTube couldn’t play it here. You can open the official video below.');setPlaying(false);callbacks.current.onPlayback(false);callbacks.current.onActiveChange(false)}}})}).catch(()=>{if(disposed)return;setFailed(true);setStatus('The music player couldn’t connect. The official video is linked below.');callbacks.current.onActiveChange(false)});
 return()=>{disposed=true;player.current?.destroy();player.current=null;mount.remove()};
 },[mounted]);
 function close(){onActiveChange(false);onPlayback(false);setPlaying(false);setMounted(false);setStatus('Play it quietly while you look around.')}
 return <section className={`soundtrack ${mounted?'soundtrack-open':''}`} aria-label="Background music"><div className="soundtrack-caption"><button className={`pixel-record ${playing?'spinning':''}`} aria-label={active?'Pause Enjoy the Silence':'Play Enjoy the Silence softly'} onClick={()=>onActiveChange(!active)}><span/><i/></button><div><span className="handwritten">something to listen to</span><h2>Enjoy the Silence</h2><p>Depeche Mode <span>·</span> a little quieter, for here.</p></div><button className="song-toggle" onClick={()=>onActiveChange(!active)}>{active?'Pause':'Play softly'}<span aria-hidden="true">{active?'Ⅱ':'▷'}</span></button></div>{mounted&&<div className="soundtrack-expanded"><div className="youtube-mount" ref={host}/><div className="soundtrack-controls"><p role="status">{status}</p><div className="volume-row"><span>Volume</span><Slider className="song-volume" aria-label="Background music volume" value={[volume]} min={0} max={100} onValueChange={v=>{const next=Array.isArray(v)?v[0]:v;setVolume(next);volumeRef.current=next;player.current?.setVolume(next)}}/><output>{volume}%</output></div><a href="https://www.youtube.com/watch?v=aGSKrC7dGcY" target="_blank" rel="noreferrer">{failed?'Open the official video ↗':'Official video on YouTube ↗'}</a><button className="stop-music" onClick={close}>Stop & put the record away</button></div></div>}</section>;
}
