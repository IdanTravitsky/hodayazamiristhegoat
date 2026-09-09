import React,{act,useState} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {useTimedEffect} from '../app/tribute/useTimedEffect';
import Soundtrack from '../app/tribute/Soundtrack';
import Tribute from '../app/tribute/Tribute';

vi.mock('@/components/ui/slider',()=>({Slider:()=> <div>Volume control</div>}));
vi.mock('@/components/ui/dialog',()=>({
 Dialog:({open,children}:any)=>open?<div role="dialog">{children}</div>:null,
 DialogContent:({children}:any)=><div>{children}</div>,
 DialogTitle:({children}:any)=><h2>{children}</h2>,
 DialogDescription:({children}:any)=><p>{children}</p>,
}));
let root:Root,container:HTMLDivElement;
beforeEach(()=>{
 (globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
 container=document.createElement('div');document.body.appendChild(container);root=createRoot(container);
 localStorage.clear();
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);
});
afterEach(()=>{act(()=>root.unmount());container.remove();vi.useRealTimers();delete (window as any).YT;});
async function render(node:React.ReactNode){await act(async()=>{root.render(node)});}
async function clickText(text:string){const button=[...container.querySelectorAll('button')].find(b=>b.textContent===text);expect(button).toBeTruthy();await act(async()=>button!.click());}
async function clickLabel(label:string){const button=container.querySelector<HTMLButtonElement>('[aria-label="'+label+'"]');expect(button).toBeTruthy();await act(async()=>button!.click());}

describe('repeatable effects',()=>{
 it('repeated taps restart the full lifetime and cancel the earlier expiry',async()=>{
  vi.useFakeTimers();
  function Example(){const effect=useTimedEffect(7000);return <><button onClick={effect.start}>Again</button><output>{effect.active?'active':'idle'}</output></>;}
  await render(<Example/>);await clickText('Again');
  act(()=>vi.advanceTimersByTime(5000));await clickText('Again');
  act(()=>vi.advanceTimersByTime(2500));expect(container.querySelector('output')!.textContent).toBe('active');
  act(()=>vi.advanceTimersByTime(4500));expect(container.querySelector('output')!.textContent).toBe('idle');
 });
 it('cleans up its timer when the component unmounts',async()=>{
  vi.useFakeTimers();
  function Example(){const effect=useTimedEffect(3500);return <button onClick={effect.start}>Again</button>;}
  await render(<Example/>);await clickText('Again');await render(<div/>);expect(vi.getTimerCount()).toBe(0);
 });
});

describe('music playback',()=>{
 let instances:any[];
 function Harness(){const [active,setActive]=useState(false),[playing,setPlaying]=useState(false);return <><output>{active?'requested':'stopped'} / {playing?'playing':'silent'}</output><Soundtrack active={active} onActiveChange={setActive} onPlayback={setPlaying}/></>;}
 beforeEach(()=>{
  instances=[];
  (window as any).YT={Player:class{
   events:any;frame:HTMLIFrameElement;playVideo=vi.fn();pauseVideo=vi.fn();setVolume=vi.fn();destroy=vi.fn();
   constructor(mount:HTMLElement,config:any){this.events=config.events;this.frame=document.createElement('iframe');mount.replaceWith(this.frame);instances.push(this);}
   getIframe(){return this.frame;}
  }};
 });
 async function start(){await render(<Harness/>);await clickLabel('Play Enjoy the Silence softly');await act(async()=>instances[0].events.onReady({target:instances[0]}));return instances[0];}
 it('synchronizes both directions when the embedded video is played or paused',async()=>{
  const p=await start();expect(p.setVolume).toHaveBeenCalledWith(18);
  await act(async()=>p.events.onStateChange({data:1}));expect(container.querySelector('output')!.textContent).toBe('requested / playing');
  await act(async()=>p.events.onStateChange({data:2}));expect(container.querySelector('output')!.textContent).toBe('stopped / silent');
  expect(container.querySelector('[aria-label="Play Enjoy the Silence softly"]')).toBeTruthy();
  await act(async()=>p.events.onStateChange({data:1}));expect(container.querySelector('output')!.textContent).toBe('requested / playing');
 });
 it('shows a truthful stopped state when browser autoplay is blocked',async()=>{
  const p=await start();await act(async()=>p.events.onAutoplayBlocked());
  expect(container.querySelector('output')!.textContent).toBe('stopped / silent');
  expect(container.textContent).toContain('Tap play on the video to begin.');
 });
 it('recreates a failed player on retry and ignores late events from the old player',async()=>{
  const p=await start();await act(async()=>p.events.onError());
  expect(container.textContent).toContain('Retry music');
  await clickText('Retry music');expect(instances).toHaveLength(2);expect(p.destroy).toHaveBeenCalledOnce();
  await act(async()=>instances[1].events.onReady({target:instances[1]}));
  await act(async()=>instances[1].events.onStateChange({data:1}));
  await act(async()=>p.events.onError());expect(container.querySelector('output')!.textContent).toBe('requested / playing');
 });
 it('offers retry if an embedded player never becomes ready',async()=>{
  vi.useFakeTimers();await render(<Harness/>);await clickLabel('Play Enjoy the Silence softly');
  await act(async()=>vi.advanceTimersByTime(20000));expect(container.textContent).toContain('Retry music');
  expect(container.querySelector('output')!.textContent).toBe('stopped / silent');
 });
});

describe('saved world and discoveries',()=>{
 it('restores Blood Moon, daytime outfits in the nightmare, and caught fireflies after reload',async()=>{
  await render(<Tribute/>);await clickLabel('Turn on the night sky');await clickLabel('Look closer at the moon');await clickText('Of course she is.');
  await clickLabel('Wear Leon outfit');await clickLabel('Catch golden firefly 1');
  const saved=JSON.parse(localStorage.getItem('hodaya-little-world-v1')!);
  expect(saved.phase).toBe('bloodmoon');expect(saved.outfit).toBe('leon');expect(saved.caught).toEqual([0]);
  await render(<div/>);await render(<Tribute/>);
  expect(container.querySelector('.blood-moon')).toBeTruthy();
  expect(container.querySelector('[aria-label="Wear Leon outfit"]')!.getAttribute('aria-pressed')).toBe('true');
  expect(container.querySelector('[aria-label="Catch golden firefly 1"]')).toBeNull();
  expect(container.querySelectorAll('.outfit-choice')).toHaveLength(14);
 });
 it('preserves old saved progress without a phase field',async()=>{
  localStorage.setItem('hodaya-little-world-v1',JSON.stringify({version:1,outfit:'doll',unlocked:['java'],tried:['hunter','doll'],javaDeleted:true,leonCount:2}));
  await render(<Tribute/>);
  expect(container.querySelectorAll('.outfit-choice')).toHaveLength(6);
  expect(container.querySelector('[aria-label="Java is in the recycle bin"]')).toBeTruthy();
 });
 it('puts petting feedback on the goat, and suppresses notices while the note is open',async()=>{
  await render(<Tribute/>);await clickLabel('Pet the little goat');
  expect(container.querySelector('.footer-goat .goat-hearts')).toBeTruthy();
  await clickText('להודיה');expect(container.querySelector('.achievement-toast')).toBeNull();
  expect(container.querySelector('.idan-letter')!.textContent).toContain('מגיע לך לשמוע את זה');
 });
});

describe('touch-pointer drops',()=>{
 async function pointer(element:Element,type:string,x:number,y:number){
  const event=new Event(type,{bubbles:true,cancelable:true});
  Object.assign(event,{pointerId:7,pointerType:'touch',isPrimary:true,button:0,clientX:x,clientY:y});
  await act(async()=>element.dispatchEvent(event));
 }
 async function prepare(){
  await render(<Tribute/>);
  const file=container.querySelector<HTMLButtonElement>('.desktop-file')!,bin=container.querySelector('.recycle-bin')!;
  file.setPointerCapture=vi.fn();file.hasPointerCapture=()=>true;file.releasePointerCapture=vi.fn();
  vi.spyOn(bin,'getBoundingClientRect').mockReturnValue({left:220,right:310,top:300,bottom:390,width:90,height:90,x:220,y:300,toJSON:()=>({})});
  return file;
 }
 it('follows a touch pointer, highlights the bin, and removes the file on release',async()=>{
  const file=await prepare();
  await pointer(file,'pointerdown',60,330);await pointer(file,'pointermove',260,330);
  expect(container.querySelector('.recycle-bin.drop-ready')).toBeTruthy();
  expect(document.querySelector('.java-drag-ghost')).toBeTruthy();
  await pointer(file,'pointerup',260,330);
  expect(container.querySelector('.desktop-file')).toBeNull();
  expect(document.querySelector('.java-drag-ghost')).toBeNull();
  expect(JSON.parse(localStorage.getItem('hodaya-little-world-v1')!).javaDeleted).toBe(true);
 });
 it('cancellation above the bin cleans up without deleting the file',async()=>{
  const file=await prepare();
  await pointer(file,'pointerdown',60,330);await pointer(file,'pointermove',260,330);await pointer(file,'pointercancel',260,330);
  expect(container.querySelector('.desktop-file')).toBeTruthy();
  expect(container.querySelector('.drop-ready')).toBeNull();
  expect(document.querySelector('.java-drag-ghost')).toBeNull();
 });
});
