// Purpose-drawn pixel art. All shapes rasterized onto a fixed grid without antialiasing.
export type Outfit = 'hunter'|'leon'|'ranni'|'maelle'|'max'|'lux'|'grace'|'eras'|'doll'|'consort'|'mohg'|'jill'|'claire'|'wesker';
export const outfits: {id:Outfit;name:string;game:string;title:string;quip:string;bg:string;night?:boolean}[]=[
 {id:'hunter',name:'The Hunter',game:'Bloodborne',title:'Hodaya, the good hunter',quip:'The hunt can wait. She found a better outfit.',bg:'#cfdfd8'},
 {id:'leon',name:'Leon',game:'Resident Evil',title:'Hodaya S. Kennedy',quip:'The jacket was borrowed. Indefinitely.',bg:'#e6d9c4'},
 {id:'ranni',name:'Ranni',game:'Elden Ring',title:'Age of Hodaya',quip:'A thousand-year voyage. She packed light.',bg:'#d7dfe9'},
 {id:'maelle',name:'Maelle',game:'Expedition 33',title:'For those who come after',quip:'The paint is still wet. Do not lean on her.',bg:'#e8d7d1'},
 {id:'max',name:'Max',game:'Life is Strange',title:'A moment, reconsidered',quip:'One more rewind. She blinked in that photo.',bg:'#dce1ca'},
 {id:'lux',name:'Lux',game:'League of Legends',title:'Microsoft Excel has entered the Rift',quip:'The final spark is conditional formatting.',bg:'#e7dfc5'},
 {id:'grace',name:'Grace',game:'Resident Evil',title:'Hodaya, incident analyst',quip:'“The server is breathing.” Ticket priority: high.',bg:'#d3dfda'},
 {id:'eras',name:'The Eras',game:'Taylor Swift',title:'In her hitless era',quip:'The only thing taking damage is her ticket budget.',bg:'#ebd4d3'},
 {id:'doll',name:'The Doll',game:'Bloodborne',title:'Welcome home, good Hodaya',quip:'“Let the echoes become your strength.”',bg:'#d6c8cc',night:true},
 {id:'consort',name:'Consort Radahn',game:'Elden Ring',title:'Promised Consort Hodaya',quip:'Beat him hitless. Borrowed his entire outfit.',bg:'#dbcba9',night:true},
 {id:'mohg',name:'Mohg',game:'Elden Ring',title:'Hodaya, Lord of Blood',quip:'NIHIL. She was told there would be refreshments.',bg:'#d4b8b9',night:true},
 {id:'jill',name:'Jill Valentine',game:'Resident Evil',title:'Hodaya Valentine',quip:'Master of unlocking. Still forgot the campus Wi-Fi password.',bg:'#c2d2d7',night:true},
 {id:'claire',name:'Claire Redfield',game:'Resident Evil',title:'Hodaya Redfield',quip:'The vest stays. Chris can find his own ride.',bg:'#dec4c5',night:true},
 {id:'wesker',name:'Albert Wesker',game:'Resident Evil',title:'Hodaya has seven minutes',quip:'Seven minutes. Then she has class.',bg:'#c4cec7',night:true},
];
type Ctx=CanvasRenderingContext2D;
export const nightmares:Record<Outfit,{title:string;quip:string}>={
 hunter:{title:'Hodaya, keeper of the moths',quip:'The cloak grew feathers. She kept it.'},
 leon:{title:'The jacket is the boyfriend now',quip:'She’s keeping the jacket.'},
 ranni:{title:'Hodaya, the moon’s missing half',quip:'Four hands. Still refusing to carry your bags.'},
 maelle:{title:'Hodaya, just outside the canvas',quip:'The canvas escaped. She’s keeping it as a pet.'},
 max:{title:'Hodaya, outside the photograph',quip:'Every photograph remembers a slightly different Tuesday.'},
 lux:{title:'Our Lady of Conditional Formatting',quip:'The stained glass says #REF! The light is beautiful, though.'},
 grace:{title:'Incident report: the files are alive',quip:'She asked for supporting documents. They followed her home.'},
 eras:{title:'Hodaya, haunting the encore',quip:'Even her reflection couldn’t get tickets.'},
 doll:{title:'Hodaya, gently unravelling',quip:'Please don’t pull the thread.'},
 consort:{title:'Hodaya, collector of fallen stars',quip:'The meteor is on a leash now. It knows what she did.'},
 mohg:{title:'Hodaya and the forbidden bouquet',quip:'Blood roses. Surprisingly low maintenance.'},
 jill:{title:'Hodaya’s extremely green herb',quip:'It healed her. Then it asked for a snack.'},
 claire:{title:'Little Red, after Raccoon City',quip:'The basket is haunted. She packed snacks anyway.'},
 wesker:{title:'Hodaya’s shadow called in sick',quip:'Seven minutes. One escaped shadow. Still serving.'},
};
export function rect(c:Ctx,x:number,y:number,w:number,h:number,color:string){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
function line(c:Ctx,x:number,y:number,xx:number,yy:number,color:string,w=1){x=Math.round(x);y=Math.round(y);xx=Math.round(xx);yy=Math.round(yy);const dx=Math.abs(xx-x),sx=x<xx?1:-1,dy=-Math.abs(yy-y),sy=y<yy?1:-1;let e=dx+dy;for(let n=0;n<1000;n++){rect(c,x,y,w,w,color);if(x===xx&&y===yy)break;const v=e*2;if(v>=dy){e+=dy;x+=sx}if(v<=dx){e+=dx;y+=sy}}}
function polygon(c:Ctx,p:number[][],color:string){const min=Math.min(...p.map(a=>a[1])),max=Math.max(...p.map(a=>a[1]));for(let y=Math.ceil(min);y<=max;y++){let nodes:number[]=[];for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]<y&&b[1]>=y)||(b[1]<y&&a[1]>=y))nodes.push(a[0]+(y-a[1])/(b[1]-a[1])*(b[0]-a[0]))}nodes=nodes.sort((a,b)=>a-b);for(let i=0;i<nodes.length;i+=2)rect(c,nodes[i],y,nodes[i+1]-nodes[i]+1,1,color)}}
function oval(c:Ctx,x:number,y:number,rx:number,ry:number,color:string){for(let i=-ry;i<=ry;i++){const w=Math.floor(rx*Math.sqrt(1-i*i/(ry*ry)));rect(c,x-w,y+i,w*2+1,1,color)}}
const baseCol={outline:'#333b42',hairDark:'#796349',hair:'#b09368',hairLight:'#d1b884',skin:'#e6be99',skinLight:'#f4d2ad',skinShadow:'#c68e78',eye:'#364543',blush:'#d99687',boot:'#343e45'};
// 48×72 source sprites share Hodaya's face, hair, proportions and lighting.
export function person(c:Ctx,skin:Outfit,t:number,x:number,y:number,s=1,pet=false,nightmare=false){c.save();c.translate(Math.round(x),Math.round(y));c.scale(s,s);const col=baseCol;const r=(a:number,b:number,w:number,h:number,k:string)=>rect(c,a,b,w,h,k);const p=(v:number[][],k:string)=>polygon(c,v,k);let bob=Math.floor(t*2)%2;let blink=Math.floor(t*6)%31===0;let b=64-bob;
 if(nightmare)nightmareArt(c,skin,t,bob,0);
 oval(c,24,68,15,3,'#7a958344');
 // Back hair: irregular contours and discrete shaded strands.
 p([[13,18],[15,12],[22,9],[31,11],[36,16],[37,35],[39,45],[33,49],[28,40],[16,48],[10,44],[13,34]],col.outline);
 p([[15,18],[17,13],[23,11],[30,13],[34,17],[35,35],[37,43],[33,46],[29,37],[17,45],[12,43],[15,32]],col.hairDark);
 r(14,23,3,18,col.hair);r(32,19,3,23,col.hair);r(16,16,3,9,col.hairLight);
 // Legs and boots.
 r(17,b-17,7,15,skin==='eras'?col.skin:'#4c5961');r(26,b-17,7,15,skin==='eras'?col.skin:'#405058');r(17,b-3,7,7,col.boot);r(26,b-3,7,7,col.boot);r(15,b+2,9,3,col.outline);r(26,b+2,10,3,col.outline);r(17,b-2,2,3,'#73776d');r(28,b-2,2,3,'#667269');
 const coats:Record<Outfit,string>={hunter:'#46555a',leon:'#8a6b4d',ranni:'#a3b9c2',maelle:'#aa5f59',max:'#c99b9a',lux:'#d2c7a0',grace:'#898e89',eras:'#bc7494',doll:'#84606a',consort:'#b08b48',mohg:'#362f3c',jill:'#526778',claire:'#984e60',wesker:'#30333b'};const coat=coats[skin];
 p([[17,b-30],[12,b-25],[14,b-10],[18,b-9],[17,b-1],[25,b-4],[31,b-1],[36,b-5],[34,b-24],[30,b-30]],col.outline);
 p([[18,b-29],[14,b-25],[16,b-11],[19,b-12],[18,b-3],[24,b-6],[30,b-3],[34,b-6],[32,b-25],[29,b-29]],coat);
 r(21,b-28,7,18,skin==='max'?'#eae2ce':skin==='lux'?'#517c98':skin==='maelle'?'#d7c1a0':'#3e474a');
 if(skin==='hunter'){p([[13,b-23],[9,b-2],[17,b+1],[22,b-7],[21,b-25]],'#40525a');p([[29,b-26],[31,b-6],[37,b-1],[37,b-12],[33,b-24]],'#34474f');line(c,15,b-22,12,b-3,'#71807e');r(17,b-28,15,4,'#68746f');r(18,b-25,12,3,'#9c8d76');r(26,b-25,4,8,'#9c8d76');r(15,b-13,20,2,'#aa8e62');r(25,b-14,3,4,'#d0b685');line(c,8,b-13,2,b+1,'#788883',3);p([[0,b+1],[3,b-2],[12,b+2],[10,b+5],[2,b+4]],'#afbbb0');r(0,b+3,10,1,'#626f70');for(let j=0;j<4;j++)r(j*3,b+4,1,2,col.outline)}
 if(skin==='leon'){p([[18,b-28],[21,b-19],[24,b-23],[19,b-30]],'#dbcca5');p([[28,b-28],[26,b-22],[29,b-19],[32,b-27]],'#dbcca5');r(15,b-23,3,12,'#a1815b');r(32,b-21,2,10,'#6e5744');r(17,b-11,17,3,'#c1ad83');r(18,b-10,16,1,'#deca9f');r(20,b-1,3,5,'#758278');r(34,b-16,6,3,'#3f4549')}
 if(skin==='ranni'){p([[15,b-28],[8,b-5],[12,b+4],[22,b+6],[36,b+4],[41,b],[33,b-28]],'#788faa');p([[19,b-29],[15,b+3],[24,b+5],[31,b+2],[29,b-29]],'#cad4ce');line(c,18,b-18,16,b+1,'#eef0d9');p([[14,b-24],[8,b-11],[14,b-7],[18,b-24]],'#b8c8c8');p([[33,b-24],[42,b-14],[39,b-10],[29,b-24]],'#bacacb');r(8,b-9,5,3,'#a7c7d1');r(36,b-10,5,3,'#a7c7d1');r(16,b-24,17,3,'#d4d6c6');r(24,b-24,2,7,'#b39c6f')}
 if(skin==='maelle'){r(16,b-25,3,18,'#d78f79');r(31,b-22,2,16,'#774c50');r(16,b-9,19,2,'#58483e');r(22,b-9,3,2,'#d5b776');line(c,20,b-26,30,b-11,'#bba173',2);r(19,b-24,2,2,'#dec39a');line(c,39,b-28,36,b+2,'#bfd0c5');line(c,35,b-20,42,b-20,'#cdb079');r(38,b-19,1,7,'#756049')}
 if(skin==='max'){r(16,b-25,3,16,'#e5beb5');r(31,b-24,2,15,'#aa7b82');r(23,b-24,3,6,'#beae96');line(c,17,b-26,31,b-9,'#695d50',2);r(29,b-10,7,10,'#8f8263');r(30,b-9,6,2,'#b2a17a');r(19,b-19,11,7,'#4d5d5c');r(20,b-20,4,2,'#9cab9f');oval(c,25,b-16,3,3,'#94b6b4');r(24,b-17,2,2,'#334f5c')}
 if(skin==='lux'){p([[15,b-27],[10,b-23],[14,b-19],[19,b-24]],'#e4d8b8');p([[30,b-27],[37,b-24],[35,b-20],[28,b-23]],'#e4d8b8');r(18,b-12,15,3,'#bd9f61');r(22,b-10,8,5,'#40758c');p([[17,b-9],[12,b+1],[21,b+2],[24,b-6]],'#c5c4ad');p([[31,b-9],[36,b+1],[27,b+2],[25,b-6]],'#c5c4ad');line(c,39,b-32,39,b+3,'#a98b58',2);oval(c,39,b-33,5,5,'#ac905b');oval(c,39,b-34,3,4,'#e9e6b9');r(38,b-36,2,3,'#ffffdf')}
 if(skin==='grace'){r(17,b-26,3,17,'#b4b7a8');r(31,b-22,2,12,'#6c7671');r(23,b-27,4,18,'#d5d4bd');r(24,b-27,1,17,'#827c6b');r(29,b-22,3,5,'#d6c69e');r(30,b-21,1,1,'#808d77');line(c,21,b-24,29,b-13,'#4e5c54');r(7,b-13,9,10,'#ab9c79');r(8,b-12,7,7,'#d5ccac');r(9,b-10,5,1,'#88937b')}
 if(skin==='eras'){p([[18,b-28],[14,b-22],[17,b-12],[13,b-5],[24,b-1],[36,b-5],[31,b-12],[32,b-24],[28,b-28]],'#b57798');r(20,b-28,7,5,col.skin);for(let j=0;j<29;j++){let xx=16+(j*7)%16,yy=b-24+(j*3)%19;r(xx,yy,1,1,j%3?'#eec4c4':'#f8ecc1')}r(18,b-3,5,8,'#b47a94');r(28,b-3,5,8,'#b47a94');r(17,b+2,7,3,'#c28a9d');r(28,b+2,7,3,'#c28a9d');line(c,38,b-18,38,b-9,'#596665',2);oval(c,38,b-20,2,3,'#849991')}
 // The six after-hours outfits have individual silhouettes, not recoloured coats.
 if(skin==='doll'){
 p([[18,b-28],[30,b-28],[35,b-13],[42,b+4],[36,b+6],[11,b+6],[6,b+3],[13,b-14]],'#4d454e');
 p([[17,b-19],[31,b-19],[39,b+3],[32,b+5],[12,b+4],[9,b+2]],'#929089');
 p([[21,b-19],[26,b-19],[30,b+4],[18,b+4]],'#c4beb0');
 for(let i=0;i<7;i++)r(11+i*4,b+2,2,3,'#e3d7bf');
 p([[16,b-30],[31,b-30],[37,b-17],[29,b-13],[23,b-19],[15,b-14],[10,b-17]],'#84606a');
 line(c,13,b-18,22,b-24,'#b08886',2);line(c,25,b-24,34,b-18,'#b08886',2);
 r(22,b-26,4,6,'#e0cfc0');r(23,b-26,2,3,'#b88c85');r(12,b-14,4,5,'#d6cdc0');r(33,b-14,4,5,'#d6cdc0');
 }
 if(skin==='consort'){
 p([[12,b-29],[4,b-25],[7,b-17],[13,b-19],[11,b+4],[18,b+6],[22,b-10],[29,b-10],[33,b+5],[41,b+3],[36,b-20],[42,b-19],[43,b-25],[33,b-30]],'#855347');
 p([[17,b-29],[11,b-24],[16,b-10],[18,b-4],[32,b-5],[35,b-24],[30,b-29]],'#b08b48');
 p([[14,b-28],[5,b-27],[4,b-21],[10,b-17],[18,b-22]],'#ccab65');p([[32,b-28],[42,b-27],[43,b-21],[37,b-17],[29,b-22]],'#c5a05a');
 for(let i=0;i<4;i++){r(19,b-25+i*4,11,2,'#e0c185');r(22+i%2*3,b-24+i*4,2,3,'#8b713e')}
 r(16,b-10,18,3,'#5f5140');r(22,b-10,5,3,'#e7c483');r(17,b-3,7,6,'#a98b51');r(27,b-3,7,6,'#a98b51');
 line(c,4,b-7,0,b-30,'#737778',3);line(c,4,b-7,1,b-28,'#d5cfb7');line(c,0,b-8,8,b-10,'#d5af63',2);
 line(c,42,b-7,46,b-30,'#737778',3);line(c,43,b-7,47,b-28,'#d5cfb7');line(c,39,b-10,46,b-8,'#d5af63',2);
 }
 if(skin==='mohg'){
 p([[14,b-29],[34,b-29],[35,b-14],[42,b+5],[32,b+7],[24,b+4],[15,b+7],[7,b+4],[12,b-13]],'#362f3c');
 p([[16,b-26],[24,b-20],[33,b-26],[31,b-13],[36,b+4],[27,b+4],[22,b-15],[18,b+4],[11,b+3]],'#6c3e4b');
 line(c,14,b-27,24,b-19,'#b69862',2);line(c,34,b-27,24,b-19,'#b69862',2);line(c,24,b-19,31,b+3,'#b69862',2);
 for(let i=0;i<5;i++){r(29+i,b-14+i*3,2,1,'#e3c188');r(12+i*5,b+3,3,2,'#b49761')}
 line(c,41,b-40,41,b+4,'#ad8b58',2);line(c,35,b-40,35,b-33,'#d0aa6a',2);line(c,47,b-40,47,b-33,'#d0aa6a');line(c,35,b-33,41,b-28,'#ad8b58',2);line(c,47,b-33,41,b-28,'#ad8b58',2);r(40,b-44,3,6,'#d0aa6a');
 }
 if(skin==='jill'){
 p([[16,b-29],[11,b-25],[14,b-12],[20,b-11],[29,b-11],[36,b-15],[35,b-25],[30,b-29]],'#789cac');
 r(17,b-25,15,12,'#a9c3ca');r(19,b-28,3,17,'#3d535e');r(28,b-28,3,17,'#3d535e');r(16,b-12,18,4,'#465863');r(24,b-12,3,3,'#b8c8b8');
 r(12,b-25,5,5,'#8bb0bd');r(14,b-24,2,2,'#d9dcca');r(31,b-22,4,7,'#557585');r(32,b-9,4,8,'#394b53');r(18,b-3,5,5,'#62747a');
 }
 if(skin==='claire'){
 p([[18,b-29],[13,b-25],[15,b-10],[32,b-10],[35,b-25],[29,b-29]],'#8d354c');
 r(19,b-26,11,16,'#303c44');p([[17,b-28],[21,b-23],[19,b-17],[18,b-11],[14,b-12],[14,b-25]],'#c75d70');p([[29,b-28],[26,b-23],[29,b-17],[29,b-11],[33,b-12],[33,b-25]],'#b84b62');
 r(12,b-23,4,11,col.skin);r(34,b-23,4,11,col.skin);r(12,b-14,4,4,'#3b3e46');r(34,b-14,4,4,'#3b3e46');r(16,b-10,19,3,'#715f53');r(24,b-10,4,3,'#d2b891');
 r(17,b-6,7,10,'#506479');r(27,b-6,7,10,'#45566d');r(18,b-5,2,7,'#8393a0');r(32,b-6,4,6,'#3d4149');
 }
 if(skin==='wesker'){
 p([[17,b-29],[11,b-23],[15,b-11],[11,b+4],[21,b+5],[24,b-6],[29,b+5],[39,b+3],[34,b-12],[36,b-23],[30,b-29]],'#30333b');
 p([[18,b-27],[22,b-18],[18,b-15],[16,b-24]],'#5a5960');p([[28,b-27],[25,b-18],[30,b-15],[33,b-24]],'#696268');
 r(23,b-26,4,18,'#46464e');r(17,b-9,16,2,'#847a6a');r(24,b-10,3,3,'#b4aa8c');line(c,15,b-5,13,b+2,'#666067');line(c,34,b-5,37,b+1,'#666067');
 }
 if(nightmare)nightmareArt(c,skin,t,bob,1);
 // Hands and head. Accessories stay around a consistent, recognizable face.
 if(skin!=='ranni'){r(12,b-14,4,5,col.skin);r(34,b-14,4,5,col.skin);r(12,b-14,1,3,col.skinLight)}
 r(21,31-bob,7,6,col.skinShadow);p([[16,17-bob],[19,14-bob],[28,14-bob],[32,18-bob],[32,28-bob],[29,33-bob],[20,33-bob],[16,29-bob]],col.skin);
 r(18,19-bob,12,9,col.skinLight);r(17,28-bob,3,2,col.blush);r(29,28-bob,3,2,col.blush);r(19,24-bob,3,blink?1:3,col.eye);r(27,24-bob,3,blink?1:3,col.eye);if(!blink){r(19,24-bob,1,1,'#f8ebd0');r(27,24-bob,1,1,'#f8ebd0')}r(23,30-bob,3,1,'#b57971');r(18,22-bob,4,1,'#8d6e50');r(27,22-bob,4,1,'#8d6e50');
 p([[14,22-bob],[14,16-bob],[19,11-bob],[27,11-bob],[33,15-bob],[34,22-bob],[30,20-bob],[27,15-bob],[22,16-bob],[18,20-bob],[16,27-bob]],col.hair);
 p([[16,16-bob],[20,12-bob],[25,12-bob],[21,15-bob],[17,22-bob],[16,27-bob],[14,34-bob]],col.hairLight);p([[28,15-bob],[32,17-bob],[32,27-bob],[35,38-bob],[32,42-bob],[29,35-bob],[30,23-bob]],col.hair);r(32,24-bob,1,10,col.hairLight);
 if(skin==='hunter'){p([[11,16-bob],[16,8-bob],[20,6-bob],[26,10-bob],[31,7-bob],[36,15-bob],[31,19-bob],[21,17-bob],[16,20-bob]],'#35464d');line(c,13,16-bob,21,14-bob,'#78827a');line(c,21,14-bob,33,16-bob,'#819085');r(17,11-bob,3,2,'#566763');r(25,14-bob,3,2,'#b89e70')}
 if(skin==='ranni'){p([[8,14-bob],[16,10-bob],[19,0],[26,3],[31,12-bob],[42,16-bob],[41,20-bob],[30,23-bob],[15,21-bob],[6,18-bob]],'#71869f');p([[14,13-bob],[20,2],[25,5],[30,14-bob],[23,17-bob]],'#b9c9cd');line(c,9,17-bob,24,20-bob,'#e3e4cf');line(c,24,20-bob,40,17-bob,'#d1d8d0');r(23,11-bob,6,3,'#8eaaad')}
 if(skin==='lux'){r(17,17-bob,15,2,'#c7ac69');p([[21,18-bob],[24,14-bob],[27,18-bob],[24,21-bob]],'#e6d393');r(24,17-bob,1,2,'#769eb0')}
 if(skin==='eras'){r(33,29-bob,2,3,'#e9c683');r(14,29-bob,2,3,'#e9c683')}
 if(skin==='doll'){p([[12,24-bob],[10,14-bob],[15,7-bob],[26,6-bob],[35,12-bob],[37,25-bob],[32,20-bob],[31,14-bob],[18,13-bob],[15,22-bob]],'#76646c');line(c,14,14-bob,19,10-bob,'#d3c6b7',2);line(c,19,10-bob,28,10-bob,'#d3c6b7',2);line(c,28,10-bob,33,16-bob,'#d3c6b7',2);r(12,21-bob,3,6,'#b59e91');r(34,21-bob,3,6,'#b59e91');r(18,32-bob,13,3,'#bcaea0')}
 if(skin==='consort'){p([[12,19-bob],[10,8-bob],[15,3-bob],[19,9-bob],[23,5-bob],[28,8-bob],[35,2-bob],[38,8-bob],[35,21-bob],[32,16-bob],[15,16-bob]],'#8e493f');p([[13,15-bob],[16,9-bob],[21,12-bob],[24,8-bob],[28,12-bob],[34,9-bob],[35,17-bob],[28,15-bob],[20,15-bob]],'#ccac64');r(22,13-bob,5,5,'#e3c583');r(23,14-bob,3,2,'#8b6148')}
 if(skin==='mohg'){line(c,17,16-bob,10,11-bob,'#4b3b43',4);line(c,10,11-bob,12,4-bob,'#4b3b43',3);line(c,12,4-bob,16,2-bob,'#ae8b74',2);line(c,17,16-bob,11,11-bob,'#967765');line(c,32,16-bob,38,10-bob,'#4b3b43',4);line(c,38,10-bob,35,3-bob,'#9e8069',3);line(c,35,3-bob,31,1-bob,'#ccb092');line(c,29,17-bob,27,23-bob,'#51414a',3);r(27,24-bob,3,2,'#c0a288')}
 if(skin==='jill'){p([[11,16-bob],[12,11-bob],[18,7-bob],[30,8-bob],[35,12-bob],[32,18-bob],[21,16-bob]],'#527a8e');line(c,14,13-bob,27,11-bob,'#84a5b4',2);r(28,12-bob,4,4,'#c2c6a8');r(29,13-bob,2,2,'#788d89')}
 if(skin==='claire'){p([[29,12-bob],[35,7-bob],[41,10-bob],[43,17-bob],[41,24-bob],[44,29-bob],[39,32-bob],[36,26-bob],[37,16-bob],[32,16-bob]],col.hairDark);p([[35,10-bob],[39,11-bob],[40,19-bob],[39,26-bob],[41,29-bob],[38,27-bob],[38,17-bob]],col.hairLight);r(32,11-bob,5,3,'#ba4d67');p([[13,29-bob],[18,28-bob],[18,39-bob],[13,43-bob],[11,40-bob]],'#303c44');r(32,29-bob,4,11,'#b84b62')}
 if(skin==='wesker'){r(17,23-bob,16,4,'#292f38');r(18,24-bob,5,3,'#343c47');r(27,24-bob,5,3,'#343c47');r(18,23-bob,4,1,'#829493');r(28,23-bob,3,1,'#829493')}
 if(nightmare)nightmareArt(c,skin,t,bob,2);
 if(pet){r(21,36,2,2,'#e5babe');r(28,38,2,2,'#e5babe')}
 c.restore();}
// Nightmare costumes are authored in three layers around the original outfit.
// Their silhouettes, props and motion differ; there is no shared monster filter.
function nightmareArt(c:Ctx,k:Outfit,t:number,bob:number,layer:number){
 const r=(x:number,y:number,w:number,h:number,v:string)=>rect(c,x,y,w,h,v),p=(a:number[][],v:string)=>polygon(c,a,v),l=(x:number,y:number,xx:number,yy:number,v:string,w=1)=>line(c,x,y,xx,yy,v,w),o=(x:number,y:number,rx:number,ry:number,v:string)=>oval(c,x,y,rx,ry,v);
 const ink='#332c40',bone='#ded5ba',rose='#b57089',gold='#c6a369',blue='#8ca9b9',b=64-bob,f=Math.floor(t*3)%2;
 if(layer===0){
  switch(k){
   case 'hunter':p([[17,27],[7,29],[1,47],[7,43],[3,58],[13,54],[11,66],[23,59],[35,67],[33,53],[44,59],[40,44],[47,48],[38,29],[29,26]],'#3d374e');for(let i=0;i<6;i++){l(8+i%2*4,35+i*4,5,42+i*4,'#79728a');l(36-i%2*3,35+i*4,43,42+i*4,'#706779')}break;
   case 'ranni':o(24,25,22,22,'#7c809b');o(29,20,18,18,'#352f4e');l(6,31,1,49,blue,3);l(1,49,8,51,blue,3);l(42,30,46,47,blue,3);l(46,47,39,51,blue,3);break;
   case 'doll':for(const x of [13,22,33]){l(x,0,x+(x===22?0:f),43,'#aa9999');r(x-1,0,3,2,bone)}l(8,2,39,2,'#836373',2);break;
   case 'consort':for(let i=0;i<4;i++){const x=i<2?5:39,y=13+i%2*16+f*(i%2?1:-1);p([[x,y],[x+5,y-3],[x+8,y+3],[x+4,y+7],[x-2,y+4]],'#827081');r(x+1,y,3,2,'#c2a0b2')}break;
   case 'mohg':for(let i=0;i<3;i++){l(7+i*2,63,4+i*2,27,'#5d6458',2);l(39-i*2,63,44-i*2,24,'#5d6458',2);o(5+i*2,27-i*7,4,4,'#783c59');o(43-i*2,24-i*7,4,4,'#ae5b76');r(42-i*2,22-i*7,2,2,'#d99a9d')}break;
   case 'jill':for(let i=0;i<3;i++){const x=5+i*18;l(x,60,x+Math.sin(t+i)*3,26,'#536f5b',3);p([[x,39],[x-5,33],[x-5,41],[x,44],[x+5,36]],'#8a9b6e')}break;
   case 'claire':p([[18,19],[29,18],[39,30],[40,55],[47,64],[34,66],[25,59],[16,68],[3,65],[8,47],[9,30]],'#5d304c');p([[12,27],[7,57],[4,63],[17,60],[21,36],[32,33],[38,59],[43,62],[38,40],[35,27]],'#aa4e6b');l(8,58,16,55,'#cc8a8d');break;
   case 'wesker':p([[9,63],[4,50],[7,43],[1,33],[5,20],[11,15],[16,23],[14,35],[18,49],[33,56],[43,61],[39,69],[22,66]],'#29283b');o(9,24,5,6,'#29283b');r(6,22,2,1,gold);r(11,22,2,1,gold);break;
   case 'leon':for(let i=0;i<3;i++){l(9+i,61,2+i*2,47,'#907164',3);l(2+i*2,47,4+i*3,38+f,'#b69e82',2)}break;
   case 'maelle':p([[8,34],[3,27],[8,22],[13,30],[34,22],[45,25],[44,55],[38,58],[31,51],[10,57]],'#352f46');for(let i=0;i<4;i++)r(5+i*11,48,3,10+(i%2)*7,'#352f46');break;
   case 'max':for(let i=0;i<3;i++){const x=i===0?1:34,y=9+i*16+f;r(x,y,12,15,'#c4b8a5');r(x+2,y+2,8,9,'#647687');r(x+4,y+5,4,3,'#bca288')}break;
   case 'lux':p([[24,4],[42,17],[45,42],[24,61],[3,42],[6,17]],'#79658a');for(let i=0;i<4;i++){const y=12+i*10;p([[7,y],[19,y+5],[7,y+10]],i%2?'#92aeb0':'#c99b8c');p([[40,y],[29,y+5],[40,y+10]],i%2?'#cab178':'#a18aa9')}l(24,4,24,59,gold);break;
   case 'grace':for(let i=0;i<4;i++){const x=i%2?36:0,y=12+Math.floor(i/2)*22+f;r(x,y,11,15,'#d1cfb4');r(x+2,y+3,7,1,'#7c8e81');r(x+2,y+6,4,1,'#7c8e81');r(x+2,y+11,2,2,ink);r(x+7,y+11,2,2,ink)}break;
   case 'eras':for(let i=0;i<5;i++){const x=3+i*9;l(x,3+i%2*4,x,25+i%2*10,'#ad8e95');p([[x,20+i%2*10],[x-3,26+i%2*10],[x,32+i%2*10],[x+3,26+i%2*10]],i%2?'#b1b3c5':'#dfb6bc')}break;
  }
 }
 if(layer===1){
  switch(k){
   case 'hunter':p([[16,34],[24,39],[32,34],[31,46],[26,58],[24,54],[20,61],[17,49]],'#635b73');for(let i=0;i<4;i++){l(19,39+i*4,23,42+i*4,'#a798a1');l(29,39+i*4,25,42+i*4,'#a798a1')}o(24,43,4,3,'#c6b594');o(24,43,1,2,'#443544');break;
   case 'leon':p([[17,42],[31,42],[34,50],[30,59],[21,57],[17,51]],ink);for(let i=0;i<4;i++){p([[18+i*4,43],[21+i*4,43],[20+i*4,47]],bone);p([[19+i*3,55],[22+i*3,55],[21+i*3,51]],bone)}l(26,56,28,64+f,'#c78894',3);o(28,64+f,3,2,'#c78894');break;
   case 'ranni':p([[18,38],[31,38],[37,65],[25,69],[12,64]],'#515477');for(let i=0;i<12;i++){r(16+(i*7)%17,43+(i*3)%22,1,1,i%2?'#d7d6c4':'#9bb8c5')}l(13,43,6,54,blue,3);l(34,43,42,54,blue,3);break;
   case 'doll':for(let i=0;i<5;i++){l(12+i*5,48+i%2*4,14+i*5,65,'#5d5261');l(11+i*5,56,15+i*5,54,'#d7c7ba')}r(22,38,5,5,'#b88592');r(24,39,1,3,'#573f53');break;
   case 'consort':o(24,45,7,7,'#5a3e67');o(24,45,4,4,'#ceb586');r(22,43,4,4,'#49365f');for(let i=0;i<3;i++)l(14,53+i*4,33,53+i*4,'#886187');l(39,42,44,59,'#b798d0');break;
   case 'mohg':for(let i=0;i<5;i++){const x=14+(i*7)%20,y=42+i*4;o(x,y,3,3,i%2?'#ad647c':'#804859');r(x,y,1,1,'#e2b19e')}r(39,24,5,7,'#c6ac91');r(40,20-f,3,4,'#f1c393');break;
   case 'jill':p([[17,42],[31,42],[34,60],[27,66],[14,62]],'#547262');for(let i=0;i<4;i++){const y=44+i*5;p([[19,y],[14,y-3],[15,y+2],[21,y+4]],'#91aa7e');p([[26,y],[33,y-3],[31,y+3]],'#91aa7e')}r(22,44,5,11,'#bbad7c');break;
   case 'claire':l(33,43,43,46,'#c69870',2);r(36,47,11,11,'#95754f');r(37,47,9,2,'#ccb184');for(let i=0;i<3;i++)r(37,51+i*3,9,1,'#c5a77c');o(41,46-f,4,5,'#dfdbca');r(39,44-f,1,2,ink);r(43,44-f,1,2,ink);break;
   case 'wesker':r(17,40,16,3,'#b9a178');for(let i=0;i<4;i++){l(19,45+i*4,29,43+i*4,'#777063');r(24,45+i*4,2,1,'#c5ad7f')}l(30,50,39,57,'#393447',3);break;
   case 'maelle':p([[18,40],[30,40],[33,54],[37,65],[27,68],[20,65],[12,68],[16,52]],'#c6c4b7');for(let i=0;i<5;i++)r(14+i*4,53+i%2*3,2,13-i%3*3,'#52435a');r(37,30,4,12,'#aa775d');r(36,26,6,6,'#d8cdb4');r(37,25,4,3,'#47394e');break;
   case 'max':r(18,40,15,16,'#cec5b1');r(20,42,11,10,'#485b72');p([[22,46],[24,44],[28,47],[28,50],[22,50]],'#aa829b');r(21,54,9,1,'#9c8f80');break;
   case 'lux':p([[17,35],[24,40],[32,35],[35,59],[25,66],[13,59]],'#867395');for(let i=0;i<4;i++){const y=40+i*6;p([[24,y],[18,y+4],[24,y+7]],i%2?'#c8ba81':'#a5c1ba');p([[25,y],[32,y+4],[25,y+7]],i%2?'#bd899f':'#cfc3a1')}break;
   case 'grace':r(17,36,16,27,'#bcbbaa');r(23,36,2,27,'#6b6c68');for(let i=0;i<5;i++){r(18,41+i*4,4,1,'#728578');r(26,41+i*4,5,1,'#728578')}r(7,49,9,13,'#dcd3b9');r(9,52,2,3,ink);r(13,52,2,3,ink);break;
   case 'eras':p([[19,35],[29,35],[33,50],[37,61],[29,66],[24,62],[18,67],[11,61],[16,49]],'#75647f');for(let i=0;i<15;i++){const x=15+(i*7)%17,y=38+(i*5)%25;p([[x,y],[x+3,y+1],[x+2,y+5],[x-1,y+3]],i%3?'#d2bac8':'#8db4ba')}break;
  }
 }
 if(layer===2){
  switch(k){
   case 'hunter':p([[16,23-bob],[21,22-bob],[25,26-bob],[33,25-bob],[31,30-bob],[23,32-bob],[18,28-bob]],'#c8bdaa');r(19,24-bob,3,2,'#4e4659');l(25,26-bob,33,26-bob,'#ece1c3');break;
   case 'leon':o(14,34-bob,4,3,'#d4c3a2');o(34,34-bob,4,3,'#d4c3a2');r(13,33-bob,2,2,'#6d6657');r(34,33-bob,2,2,'#6d6657');break;
   case 'ranni':p([[17,22-bob],[32,22-bob],[32,29-bob],[27,33-bob],[18,30-bob]],'#839aaf');r(19,24-bob,3,2,'#c4d5d8');r(27,24-bob,3,2,'#c4d5d8');r(23,29-bob,3,1,'#566b84');star(c,24,10,'#e7e1bb');break;
   case 'doll':l(28,16-bob,25,21-bob,'#937985');l(25,21-bob,27,24-bob,'#937985');l(27,24-bob,25,28-bob,'#937985');r(19,24-bob,3,3,'#80717c');r(20,25-bob,1,1,'#e3cfb9');l(22,30-bob,27,30-bob,'#a27e8a');r(23,29-bob,1,3,'#a27e8a');break;
   case 'consort':star(c,24,10-bob,'#e2c291',2);o(24,10-bob,2,2,'#6e507c');break;
   case 'mohg':for(const x of [10,34]){r(x,5-bob,3,6,'#ddc1a0');p([[x,4-bob],[x+1,0],[x+3,4-bob]],'#eeb17e')}o(15,18-bob,3,3,'#bb7890');break;
   case 'jill':o(10,17+f,6,5,'#8c9d6b');o(10,19+f,5,3,'#4a4350');for(let i=0;i<3;i++)r(6+i*3,17+f,1,2,bone);r(7,13+f,2,2,'#e1d7a4');r(12,13+f,2,2,'#e1d7a4');l(11,24,12,36,'#78875e',2);break;
   case 'claire':p([[12,25-bob],[9,17-bob],[12,8-bob],[23,3-bob],[35,9-bob],[39,18-bob],[36,28-bob],[31,21-bob],[31,15-bob],[23,12-bob],[17,15-bob],[16,24-bob]],'#813d5a');l(13,18-bob,19,11-bob,'#cd8490',2);l(19,11-bob,27,10-bob,'#cd8490',2);l(27,10-bob,34,18-bob,'#ba657c',2);break;
   case 'wesker':r(17,23-bob,16,4,'#292936');r(18,24-bob,4,1,'#d7b269');r(28,24-bob,3,1,'#d7b269');star(c,38,13+f,'#c3a169');break;
   case 'maelle':r(28,25-bob,2,5,'#5b485f');r(29,29-bob,2,2,'#5b485f');r(17,18-bob,3,3,'#d1d0bf');break;
   case 'max':p([[3,19+f],[0,15+f],[0,23+f],[4,26+f],[7,23+f],[10,15+f],[6,17+f]],'#91b4be');l(5,18+f,5,26+f,'#485774');r(32,23-bob,2,4,'#be9fa3');break;
   case 'lux':for(let i=0;i<5;i++){const a=i*Math.PI/4;star(c,24+Math.cos(a)*18,20-Math.sin(a)*17,'#cbb785')}r(23,16-bob,3,4,'#b088a4');break;
   case 'grace':r(32,14-bob,10,13,'#d2c8af');r(33,16-bob,6,1,'#7c8779');r(33,19-bob,4,1,'#7c8779');p([[34,25-bob],[38,30-bob],[39,25-bob]],'#d2c8af');break;
   case 'eras':for(let i=0;i<5;i++){r(15+i*4,16-bob-(i%2)*3,2,4,'#dabeca')}l(16,17-bob,33,17-bob,'#9f879d');o(38,43,4,5,'#c9c5cd');r(36,42,1,2,'#54465d');r(40,42,1,2,'#54465d');break;
  }
 }
}
function nightmareScene(c:Ctx,k:Outfit,t:number){
 const bone='#dcd3bb',rose='#c393a3',ink='#42364e';
 const ghost=(x:number,y:number,color=bone)=>{y+=Math.floor(Math.sin(t*2+x)*2);oval(c,x,y,6,7,color);polygon(c,[[x-6,y],[x-7,y+10],[x-3,y+7],[x,y+10],[x+3,y+7],[x+6,y+10],[x+6,y]],color);rect(c,x-3,y-1,2,3,ink);rect(c,x+2,y-1,2,3,ink)};
 if(k==='consort'){for(let i=0;i<5;i++){const a=t*.5+i*1.25,x=143+Math.cos(a)*62,y=144+Math.sin(a)*39;polygon(c,[[x,y-5],[x+7,y],[x+3,y+7],[x-6,y+4]],'#9d7a95');rect(c,x-2,y,3,2,'#ddbad1')}line(c,174,156,205,166,'#d0ac7e');oval(c,213,164,9,8,'#ab797e');star(c,213,164,'#e1c595');}
 else if(k==='doll'){for(const x of [120,139,158])line(c,x,51,x,145,'#bea6a060');ghost(192,182,'#c8bdc0');}
 else if(k==='hunter'){for(let i=0;i<5;i++){const x=103+Math.sin(t+i)*49,y=75+i*17;polygon(c,[[x,y],[x-6,y-4],[x-4,y+4],[x,y+1],[x+5,y+5],[x+7,y-3]],i%2?'#c6b8ac':'#837687')}}
 else if(k==='ranni'){oval(c,142,119,53,53,'#68617b');oval(c,153,108,45,45,'#41394f');for(let i=0;i<8;i++)star(c,92+i*14,110+Math.sin(t+i)*39,'#bcbad0');}
 else if(k==='leon'){ghost(193,177,'#bdad88');for(let i=0;i<4;i++){line(c,87,186,79+i*4,174+Math.sin(t+i)*4,'#b69492',2)}}
 else if(k==='mohg'){for(let i=0;i<6;i++){const x=80+i*24,y=182+i%2*8;flower(c,x,y,'#915169');oval(c,x,y,3,3,'#b27789');rect(c,x,y,1,1,'#edc49f')}}
 else if(k==='jill'){for(const x of [90,186]){line(c,x,192,x,167,'#8a9367',3);oval(c,x,163,8,6,'#8b9a71');oval(c,x,165,6,3,ink);rect(c,x-3,163,2,2,bone);rect(c,x+2,163,2,2,bone)}}
 else if(k==='claire'){ghost(91,171);line(c,99,192,103,181,'#987986',2);heart(c,196,159,1,rose);}
 else if(k==='wesker'){polygon(c,[[176,198],[184,179],[182,147],[192,136],[200,145],[199,163],[213,171],[207,195]],'#302b40');rect(c,188,147,4,2,'#bdab80');rect(c,195,147,4,2,'#bdab80');line(c,198,167,213,156+Math.sin(t)*4,'#302b40',4)}
 else if(k==='max'){for(let i=0;i<3;i++){const x=82+i*52,y=94+i%2*33+Math.sin(t+i)*5;rect(c,x,y,18,23,bone);rect(c,x+3,y+3,12,14,'#6a7890');rect(c,x+7,y+7,4,6,rose)}}
 else if(k==='grace'){ghost(191,165);ghost(86,143);rect(c,183,165,16,20,'#d0c8b0');for(let i=0;i<4;i++)rect(c,186,169+i*3,10,1,'#7d8275')}
 else if(k==='maelle'){for(let i=0;i<7;i++)rect(c,99+i*13,162+i%2*9,4,16,'#55415d');ghost(190,159,'#cbc9bb')}
 else if(k==='lux'){for(let i=0;i<5;i++){const x=85+i*26,y=78+i%2*25;polygon(c,[[x,y],[x+6,y+12],[x,y+22],[x-5,y+10]],i%2?'#b98fa1':'#bac6bb');line(c,x,y,x,y+22,'#e0c498')}}
 else {for(let i=0;i<4;i++){const x=87+i*35;line(c,x,75,x,117+i%2*20,'#b69594');polygon(c,[[x,111+i%2*20],[x-5,119+i%2*20],[x,126+i%2*20],[x+5,119+i%2*20]],'#bfaabc')}ghost(197,181,'#c4b6cc')}
}
function star(c:Ctx,x:number,y:number,color:string,s=1){rect(c,x,y-2*s,s,5*s,color);rect(c,x-2*s,y,5*s,s,color)}
function hash(n:number){const v=Math.sin(n*73.1)*43758.55;return v-Math.floor(v)}
function tree(c:Ctx,x:number,y:number,s:number,dark=false){const a=dark?'#4f7471':'#7b9c88',b=dark?'#668978':'#94ae8d';rect(c,x-2*s,y-42*s,4*s,42*s,'#6b7763');for(let i=0;i<4;i++){polygon(c,[[x,y-(80-i*15)*s],[x-(15+i*3)*s,y-(42-i*13)*s],[x+(15+i*3)*s,y-(42-i*13)*s]],i%2?a:b);line(c,x-(13+i*3)*s,y-(43-i*13)*s,x+2*s,y-(47-i*13)*s,b)} }
function flower(c:Ctx,x:number,y:number,col:string){rect(c,x,y,1,6,'#587e66');rect(c,x-2,y+3,2,1,'#699074');rect(c,x-1,y-1,3,3,col);rect(c,x,y,1,1,'#eee0ad')}
function arch(c:Ctx,x:number,y:number,w:number,h:number,color:string){polygon(c,[[x,y+h],[x,y+w*.5],[x+w*.15,y+w*.2],[x+w*.5,y],[x+w*.85,y+w*.2],[x+w,y+w*.5],[x+w,y+h]],color)}
export function vignette(c:Ctx,skin:Outfit,t:number,hearts=false,afterDark=false,bloodMoon=false,amygdalaHappy=false){c.clearRect(0,0,280,250);c.imageSmoothingEnabled=false;let night=skin==='hunter'||skin==='ranni';let palette=bloodMoon?['#382b35','#60404a','#815358']:afterDark?['#2b485a','#3c5968','#577479']:night?['#cbdcd5','#b8d0cb','#9ab8b4']:skin==='maelle'?['#e7d6ce','#d4bebb','#b7a5a6']:['#e0e5d6','#cfdbc9','#b4c6b5'];
 // Sky is an intentional stepped silhouette, never a rectangular screenshot.
 polygon(c,[[25,148],[25,54],[36,54],[36,31],[59,31],[59,17],[86,17],[86,8],[202,8],[202,20],[228,20],[228,40],[244,40],[244,64],[254,64],[254,163]],palette[0]);
 for(let i=0;i<(afterDark?55:20);i++){const x=44+hash(i+5)*182,y=21+hash(i+14)*94;rect(c,x,y,1,1,'#f3f0d4')}oval(c,205,49,17,17,'#f3f0d3');oval(c,209,45,13,14,palette[0]);
 polygon(c,[[25,115],[70,70],[99,100],[142,61],[183,106],[220,85],[255,129],[255,175],[25,175]],palette[1]);polygon(c,[[23,147],[77,103],[111,139],[151,101],[200,136],[257,112],[257,182],[23,182]],palette[2]);
 if(skin==='hunter'||skin==='doll'||skin==='mohg'){arch(c,96,27,90,148,'#6b8787');arch(c,102,32,78,140,'#92a9a2');arch(c,109,42,64,130,'#bed0c1');for(let side=0;side<2;side++){const x=side?179:92;rect(c,x,49,9,130,'#78928a');rect(c,x-3,49,15,3,'#a4b7a5');rect(c,x-3,175,15,5,'#536f70');for(let i=0;i<9;i++)rect(c,x,58+i*13,9,1,'#536f70')}line(c,141,31,141,51,'#b3c8b8');oval(c,141,54,13,13,'#758f88');oval(c,141,54,10,10,'#e3d4a2');for(let i=0;i<8;i++){const a=i*Math.PI/4;line(c,141,54,141+Math.cos(a)*10,54+Math.sin(a)*10,'#718b7f')}for(let i=0;i<7;i++){rect(c,165+Math.sin(i)*3,56+i*10,3,8,'#5c8171');rect(c,164+Math.sin(i)*3,61+i*10,5,2,'#83a185')}}
 else if(skin==='ranni'){for(let i=0;i<28;i++)star(c,40+hash(i)*201,20+hash(i+20)*113,i%3?'#eef0d6':'#a4babc');oval(c,142,82,35,35,'#c1d1d0');oval(c,151,72,30,31,palette[0]);arch(c,86,95,20,85,'#8a9b9d');arch(c,195,110,17,65,'#91a6a2')}
 else if(['leon','grace','jill','claire','wesker'].includes(skin)){rect(c,90,78,96,100,'#a59c85');polygon(c,[[80,80],[137,42],[196,80]],'#687d70');rect(c,96,83,84,2,'#d4c5a2');rect(c,125,104,26,64,'#5a6e67');rect(c,128,108,20,60,'#415b59');rect(c,101,101,17,23,'#75978c');rect(c,157,101,17,23,'#75978c');rect(c,108,101,2,23,'#d4c5a2');rect(c,164,101,2,23,'#d4c5a2');for(let i=0;i<7;i++)rect(c,92,87+i*13,92,1,'#918e77');rect(c,113,89,50,5,'#647869');rect(c,118,90,40,2,'#d4c5a2')}
 else if(skin==='maelle'||skin==='consort'){rect(c,72,80,17,92,'#a1958c');rect(c,199,71,14,95,'#988c84');rect(c,66,75,29,6,'#c4b29b');rect(c,193,65,26,6,'#c4b29b');polygon(c,[[127,127],[131,40],[147,31],[153,50],[150,132]],'#7f7f7d');rect(c,137,61,5,31,'#d9ba91');for(let i=0;i<7;i++)rect(c,97+i*12,170-i%2*4,10,4,'#b5a48f')}
 else if(skin==='max'){rect(c,154,41,20,103,'#d9d6bc');rect(c,158,54,12,4,'#99a59b');rect(c,158,92,12,4,'#99a59b');rect(c,151,40,26,5,'#788e86');polygon(c,[[149,40],[163,26],[180,40]],'#627d79');rect(c,157,34,13,6,'#e8da9b');line(c,163,144,163,166,'#788e86',4)}
 else if(skin==='lux'){arch(c,111,62,57,104,'#99a899');arch(c,117,68,45,94,'#e1dcbb');oval(c,140,98,16,16,'#d4c38f');star(c,140,98,'#f7edbe',4);rect(c,75,151,15,20,'#8a9e8c');rect(c,197,153,15,20,'#8a9e8c')}
 else {for(let i=0;i<6;i++){const x=64+i*31;line(c,x,45,x,149,'#baa58e');star(c,x,58+(i%3)*14,i%2?'#c68d9d':'#e0ba8a',2)}rect(c,70,158,145,11,'#b89696');rect(c,67,169,151,6,'#a58989')}
 tree(c,48,183,.7);tree(c,231,178,.72,true);tree(c,257,176,.43);tree(c,22,181,.45,true);
 // Irregular floating garden: grass, soil strata and exposed roots.
 polygon(c,[[30,173],[65,170],[81,176],[110,168],[187,170],[216,167],[253,179],[263,191],[252,207],[216,215],[174,227],[102,225],[60,213],[26,199],[18,187]],'#647b68');polygon(c,[[27,186],[76,178],[206,178],[254,185],[259,194],[240,204],[188,219],[106,219],[51,208],[24,197]],'#82795e');polygon(c,[[34,192],[89,200],[189,204],[249,192],[242,207],[182,223],[104,225],[58,213]],'#6f725b');polygon(c,[[21,183],[57,174],[106,176],[130,168],[203,174],[231,173],[261,186],[251,194],[216,199],[178,197],[131,204],[76,198],[30,193]],'#9aae84');for(let i=0;i<90;i++){let x=30+hash(i+11)*220,y=179+hash(i+151)*21;rect(c,x,y,2,1,i%4?'#799671':'#b6c397')}for(let i=0;i<35;i++){let x=50+hash(i+12)*184,y=203+hash(i+711)*12;rect(c,x,y,3,1,i%3?'#92906d':'#555f52')}for(let i=0;i<4;i++){line(c,84+i*35,210,82+i*35,223+i%2*9,'#596b53');rect(c,82+i*35,216,3,3,'#94a47a')}
 // Warm path, little props and the person.
 polygon(c,[[120,166],[158,166],[181,195],[168,204],[112,206],[95,196]],'#c2bb95');for(let i=0;i<6;i++){rect(c,113-i*2,174+i*5,45+i*4,1,'#9d9f7f');rect(c,130+i%2*12,174+i*5,1,5,'#9d9f7f')}
 for(let i=0;i<25;i++){let x=i<13?37+hash(i+39)*69:184+hash(i+29)*55,y=173+hash(i+712)*23;flower(c,x,y,i%3?'#b57888':'#dfb2a3')}
 // A very tiny mushroom, sufficient to constitute an easter egg.
 rect(c,66,188,2,6,'#ddd0a7');oval(c,67,187,5,3,'#ac736d');rect(c,65,186,2,1,'#eee0bc');rect(c,70,187,1,1,'#eee0bc');
 rect(c,206,161,2,27,'#526d65');rect(c,202,157,10,11,'#657964');rect(c,204,159,6,7,'#e7c283');rect(c,206,160,2,5,'#f8dfa0');rect(c,201,156,12,2,'#526d65');polygon(c,[[201,155],[207,150],[213,155]],'#718273');
 if(!bloodMoon)person(c,skin,t,94,65,2,hearts);
 for(let i=0;i<6;i++){let x=75+hash(i+2)*130+Math.sin(t*.5+i)*5,y=90+hash(i+72)*65+Math.sin(t+i)*4;if(i%2)star(c,x,y,'#f6e3ad');else rect(c,x,y,1,2,'#c38d8f')}
 if(afterDark){for(let i=0;i<14;i++){const xx=46+hash(i+30)*188,yy=98+hash(i+80)*93;rect(c,xx+Math.sin(t+i)*4,yy+Math.sin(t*.8+i)*3,1,1,i%2?'#efdfa4':'#cee4ba')}star(c,205,47,'#ffffdb');}
 if(bloodMoon){c.save();c.globalCompositeOperation='source-atop';rect(c,0,0,280,250,'#65373838');c.restore();oval(c,205,49,23,23,'#673a41');oval(c,205,49,21,21,'#a95852');oval(c,205,49,19,19,'#d88467');oval(c,205,49,17,18,'#e9a47c');oval(c,198,45,5,8,'#c47864');oval(c,213,55,5,5,'#d58a6c');rect(c,207,35,5,2,'#f1b48a');rect(c,202,60,4,3,'#c67965');for(let i=0;i<19;i++){const x=37+hash(i+100)*209,y=29+((hash(i+612)*175+t*4)%166);rect(c,x,y,1,i%3?1:2,'#d18b73')}rect(c,204,159,6,7,'#e6a06d');rect(c,206,160,2,5,'#ffd6a0');}
 if(bloodMoon){
  rect(c,59,96,19,65,'#655460');rect(c,61,98,3,62,'#897077');rect(c,43,95,58,4,'#403744');rect(c,44,94,56,2,'#ae8c80');littleAmygdala(c,62,40,t,amygdalaHappy);
  nightmareScene(c,skin,t);
  person(c,skin,t,94,65,2,hearts,true);
 }

 if(hearts)for(let i=0;i<8;i++){let x=94+hash(i+2)*88,y=130-((t*23+i*19)%106);heart(c,x,y,1,i%2?'#b77485':'#c99299')}
}
// Six jointed arms, a ribbed torso and the familiar many-eyed almond skull.
// A deliberately tiny, eight-colour visitor, drawn directly on the scene grid.
function littleAmygdala(c:Ctx,x:number,y:number,t:number,happy:boolean){
 c.save();c.translate(x,y);const b=Math.floor(t*1.5)%2,ink='#302a35',shade='#66565e',bone='#a99185',light='#cab09a';
 const limb=(points:number[][])=>{for(let j=1;j<points.length;j++){const a=points[j-1],z=points[j];line(c,a[0],a[1],z[0],z[1],ink,5);line(c,a[0]+1,a[1],z[0]+1,z[1],shade,3);line(c,a[0]+1,a[1],z[0]+1,z[1],bone)}};
 limb([[0,7],[-16,-5],[-26,17],[-16,30]]);limb([[12,7],[28,-7],[36,12],[30,27]]);
 limb([[0,15],[-11,19],[-16,39],[-25,42]]);limb([[13,15],[23,24],[33,31],[40,29]]);
 limb([[1,23],[-5,32],[-2,49],[-10,52]]);limb([[13,23],[23,34],[18,49],[26,52]]);
 for(const [xx,yy] of [[-16,30],[30,27],[-25,42],[40,29],[-10,52],[26,52]]){for(let k=0;k<3;k++)line(c,xx+k*2,yy,xx+k*2-1,yy+4,bone)}
 polygon(c,[[-1,7],[8,3],[17,9],[14,29],[9,38],[3,33]],ink);
 polygon(c,[[1,9],[8,6],[14,10],[12,29],[8,34],[5,29]],shade);
 line(c,8,9,8,30,light);for(let i=0;i<5;i++){line(c,1+i%2,11+i*4,7,14+i*4,bone);line(c,10,14+i*4,14-i%2,11+i*4,bone)}
 polygon(c,[[-5,-15+b],[0,-22+b],[10,-25+b],[19,-19+b],[21,-8+b],[17,3+b],[10,11+b],[4,5+b],[-2,-3+b]],ink);
 polygon(c,[[-3,-14+b],[1,-20+b],[10,-22+b],[17,-17+b],[18,-8+b],[15,1+b],[10,7+b],[6,2+b],[0,-4+b]],bone);
 polygon(c,[[0,-14+b],[4,-19+b],[11,-20+b],[15,-16+b],[15,-12+b],[8,-14+b],[4,-6+b]],light);
 for(const [xx,yy] of [[2,-13],[9,-16],[14,-10],[5,-5],[12,-3]]){oval(c,xx,yy+b,2,happy?1:2,shade);rect(c,xx,yy+b,1,1,happy?'#edbfaa':'#e4bc86')}
 line(c,8,1+b,11,3+b,shade);rect(c,9,3+b,2,3,ink);
 if(happy){rect(c,1,-1+b,3,2,'#c98889');rect(c,14,-1+b,3,2,'#c98889');heart(c,27,-19-(Math.floor(t*3)%4),1,'#d99499')}
 c.restore();
}
export function heart(c:Ctx,x:number,y:number,s=1,color='#b8758b'){rect(c,x,y,s*2,s,color);rect(c,x+s*3,y,s*2,s,color);rect(c,x-s,y+s,s*7,s*2,color);rect(c,x,y+s*3,s*5,s,color);rect(c,x+s,y+s*4,s*3,s,color);rect(c,x+s*2,y+s*5,s,s,color)}
export function smallGoat(c:Ctx,t:number){c.clearRect(0,0,48,40);let y=Math.floor(t*2)%2;rect(c,12,23+y,20,10,'#b2b89b');rect(c,13,21+y,18,10,'#d5d5b5');rect(c,28,16+y,10,12,'#e6dfbf');rect(c,32,20+y,2,2,'#425e53');rect(c,13,31+y,3,7,'#78937c');rect(c,26,31+y,3,7,'#78937c');line(c,30,16+y,28,9+y,'#958766',2);line(c,35,16+y,37,9+y,'#958766',2);rect(c,35,27+y,2,4,'#dbd8b7');rect(c,9,23+y,5,2,'#c5caab');}
export function snowFriends(c:Ctx,t:number){c.clearRect(0,0,96,64);const bob=Math.floor(t*5)%2;oval(c,61,50,30,3,'#58796a33');oval(c,72,34,22,22,'#adcbd0');oval(c,73,31,20,21,'#d7e7e4');oval(c,77,26,14,14,'#edf1e2');for(let i=0;i<5;i++){const a=t*3+i*1.25;rect(c,73+Math.cos(a)*15,33+Math.sin(a)*15,2,2,'#bfd7d6')}polygon(c,[[20,48],[20,27],[25,21],[38,22],[47,31],[45,48]],'#91b5c2');oval(c,32,33,15,15,'#bfd4d8');oval(c,32,31,12,11,'#dce7e1');rect(c,25,29,3,2,'#365264');rect(c,36,29,3,2,'#365264');rect(c,29,34,7,3,'#7998a2');rect(c,28,35,2,2,'#ecedd8');rect(c,36,35,2,2,'#ecedd8');polygon(c,[[20,28],[13,21],[13,14],[19,20],[24,20]],'#88a8b8');polygon(c,[[39,21],[44,14],[46,13],[46,23],[42,29]],'#88a8b8');rect(c,19,42,7,10+bob,'#8faebb');rect(c,37,42,7,10-bob,'#8faebb');rect(c,17,50+bob,11,4,'#8faebb');rect(c,36,50-bob,12,4,'#8faebb');rect(c,14,31,6,10,'#a4c4cd');line(c,43,33,54,37,'#bdd4d8',5);rect(c,26,13+bob,10,11,'#9c6267');rect(c,28,9+bob,7,7,'#d7b58c');polygon(c,[[25,12+bob],[25,7+bob],[31,4+bob],[37,8+bob],[37,12+bob]],'#aa6d70');rect(c,27,8+bob,9,2,'#c28c80');rect(c,29,11+bob,1,1,'#425b5c');rect(c,34,11+bob,1,1,'#425b5c');rect(c,24,15+bob,14,3,'#bca36b');rect(c,32,17+bob,3,7,'#d6b77c');for(let i=0;i<7;i++)star(c,hash(i)*95,hash(i+80)*62,'#d3e0d9')}
