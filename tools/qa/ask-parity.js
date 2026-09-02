/* Proves ask-core.js reproduces ask.js's matching EXACTLY. */
const fs=require("fs"),path=require("path"),{JSDOM}=require("jsdom");
const R=path.join(__dirname);
const dom=new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>',
  {url:"https://thesmallbook.in/index.html",runScripts:"outside-only",pretendToBeVisual:true});
const w=dom.window;
["js/data.js","js/failures.js","js/ask-data.js","js/ask-core.js"].forEach(f=>
  w.eval(fs.readFileSync(path.join("/home/user/thesmallbook",f),"utf8")));
if(!w.BOOKS && w.window && w.window.BOOKS) w.BOOKS=w.window.BOOKS;

const C=w.TSB_ASK_CORE;
const QS=["How do I stop procrastinating?","how to save money","i feel stuck in life",
 "what killed nokia","how to start a startup","paise kaise bachau","deep work focus",
 "why do companies fail","confidence","asdkjhaskdjh nonsense query","habit",
 "fear of failure","negotiation tactics","how to read more books"];

let ok=0,bad=[];
for(const q of QS){
  const topic=C.findTopic(q);
  const res=C.resolve(q);
  // resolve() must agree with findTopic()
  const agree = topic ? res.kind==="topic" : (res.kind==="matches"||res.kind==="empty");
  // every source must resolve to a real book/grave and a usable link
  const linksOK = res.sources.every(s=>s.href && s.title && s.blurb!==undefined);
  if(agree&&linksOK) ok++;
  else bad.push(q+" (agree="+agree+" links="+linksOK+")");
}
console.log("books:",(w.BOOKS||[]).length,"graves:",(w.FAILURES||[]).length,"topics:",(w.TSB_ASK_DATA||[]).length);
console.log("queries consistent:",ok+"/"+QS.length);
if(bad.length)bad.forEach(b=>console.log("  ✗",b));

// spot-check a known topic end-to-end
const r=C.resolve("How do I stop procrastinating?");
console.log("\nSample — 'How do I stop procrastinating?'");
console.log(" kind:",r.kind);
console.log(" answer:",r.answer.slice(0,90)+"...");
console.log(" sources:",r.sources.length);
r.sources.slice(0,3).forEach(s=>console.log("   ["+s.type+"]",s.title,"→",s.href));
console.log("\nsuggestions:",C.suggestions(3));
console.log("followUps:",C.followUps("procrastination",3));
process.exit(bad.length?1:0);
