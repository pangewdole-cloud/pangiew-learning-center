const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist');
const pages=require('./pages.json'),manifest=require('./manifest.json');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function safeImage(value){if(typeof value!=='string'||/^[\s]*javascript:|^data:|^\/\/|[\x00-\x1f\\]|\.\./i.test(value))throw Error('Unsafe image URL');if(/^https:\/\//.test(value))return value;if(/^\/?assets\/[\w\-./%\u0080-\uffff ]+$/.test(value))return value;throw Error('Image must use HTTPS or assets/');}
function render(html,data,ranges){
 const texts=new Map(data.texts.map(x=>[x.id,x])),images=new Map(data.images.map(x=>[x.id,x]));
 for(const range of [...ranges].sort((a,b)=>b.start-a.start)){
  if(html.slice(range.start,range.end)!==range.original)throw Error('Source changed; refresh migration before building');
  let value=range.original;
  if(range.type==='text'){
   const entry=texts.get(range.id);if(!entry)throw Error('Missing text '+range.id);
   if(entry.text!==range.value)value=range.original.match(/^\s*/)[0]+escape(entry.text)+range.original.match(/\s*$/)[0];
  }else{
   const entry=images.get(range.id);if(!entry)throw Error('Missing image '+range.id);
   const src=safeImage(entry.url);
   value=value.replace(/\bsrc\s*=\s*(["']).*?\1/i,'src="'+escape(src)+'"');
   if(/\balt\s*=/.test(value))value=value.replace(/\balt\s*=\s*(["']).*?\1/i,'alt="'+escape(entry.alt)+'"');
   else value=value.replace(/\s*\/?>$/,' alt="'+escape(entry.alt)+'"/>');
   // Keep identical source bytes when image and alt values are unchanged.
   const originalSrc=range.original.match(/\bsrc\s*=\s*(["'])(.*?)\1/i)?.[2];
   const originalAlt=range.original.match(/\balt\s*=\s*(["'])(.*?)\1/i)?.[2]||'';
   if(src===originalSrc&&entry.alt===originalAlt)value=range.original;
  }
  html=html.slice(0,range.start)+value+html.slice(range.end);
 }
 return html;
}
function build(){fs.mkdirSync(out,{recursive:true});fs.cpSync(path.join(root,'site'),out,{recursive:true});fs.cpSync(path.join(root,'admin'),path.join(out,'admin'),{recursive:true});for(const [key,meta]of Object.entries(pages)){const data=JSON.parse(fs.readFileSync(path.join(root,'content',key+'.json'),'utf8'));const file=path.join(out,meta.file);fs.writeFileSync(file,render(fs.readFileSync(file,'utf8'),data,manifest[key]));}console.log('Built Pangiew website and CMS. Real login requires OAuth environment settings.');}
if(require.main===module)build();module.exports={render,safeImage,build};
