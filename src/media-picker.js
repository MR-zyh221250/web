const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

function copy(zh,en){return document.documentElement.lang==='en'?en:zh;}

function standardCrop(image){
 return new Promise(resolve=>{
  const dialog=document.createElement('dialog');dialog.className='crop-dialog';
  dialog.innerHTML=`<h2>${copy('裁剪图片','Crop image')}</h2><p>${copy('拖动图片调整位置，也可使用下方滑块。','Drag the image to reposition it, or use the controls below.')}</p><canvas width="640" height="480" aria-label="${copy('图片裁剪预览','Image crop preview')}"></canvas><label>${copy('缩放','Zoom')}<input aria-label="${copy('裁剪缩放','Crop zoom')}" type="range" min="1" max="4" step="0.01" value="1" data-range="zoom"></label><label>${copy('左右位置','Horizontal position')}<input type="range" min="0" max="1" step="0.01" value="0.5" data-range="x"></label><label>${copy('上下位置','Vertical position')}<input type="range" min="0" max="1" step="0.01" value="0.5" data-range="y"></label><div class="dialog-actions"><button type="button" data-cancel>${copy('取消','Cancel')}</button><button type="button" class="primary" data-save>${copy('确认裁剪','Apply crop')}</button></div>`;
  document.body.append(dialog);const canvas=dialog.querySelector('canvas'),ctx=canvas.getContext('2d');let zoom=1,x=.5,y=.5,start;
  const geometry=()=>{const scale=Math.max(canvas.width/image.width,canvas.height/image.height)*zoom;return {w:image.width*scale,h:image.height*scale};};
  function draw(){const {w,h}=geometry();ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,-(w-canvas.width)*x,-(h-canvas.height)*y,w,h);}
  dialog.querySelectorAll('input').forEach(el=>el.oninput=()=>{zoom=+dialog.querySelector('[data-range=zoom]').value;x=+dialog.querySelector('[data-range=x]').value;y=+dialog.querySelector('[data-range=y]').value;draw();});
  canvas.onpointerdown=e=>{start={px:e.clientX,py:e.clientY,x,y};canvas.setPointerCapture(e.pointerId);};canvas.onpointerup=()=>start=null;
  canvas.onpointermove=e=>{if(!start)return;const {w,h}=geometry(),ratio=canvas.width/canvas.clientWidth;x=clamp(start.x-(e.clientX-start.px)*ratio/Math.max(1,w-canvas.width),0,1);y=clamp(start.y-(e.clientY-start.py)*ratio/Math.max(1,h-canvas.height),0,1);dialog.querySelector('[data-range=x]').value=x;dialog.querySelector('[data-range=y]').value=y;draw();};
  let done=false;const finish=value=>{if(done)return;done=true;dialog.close();dialog.remove();resolve(value);};dialog.querySelector('[data-cancel]').onclick=()=>finish(null);dialog.oncancel=e=>{e.preventDefault();finish(null);};dialog.querySelector('[data-save]').onclick=()=>finish(canvas.toDataURL('image/jpeg',.88));draw();dialog.showModal();
 });
}

function avatarCrop(image){
 return new Promise(resolve=>{
  const dialog=document.createElement('dialog');dialog.className='crop-dialog avatar-crop-dialog';
  dialog.innerHTML=`<h2>${copy('裁剪头像','Crop avatar')}</h2><p>${copy('圆线内是最终头像范围。可拖动图片、滚轮缩放，手机支持双指缩放。','The circle shows the final avatar. Drag to move, scroll or pinch to zoom.')}</p><div class="avatar-crop-stage"><canvas width="640" height="640" aria-label="${copy('头像裁剪预览','Avatar crop preview')}"></canvas></div><div class="crop-presets"><button type="button" data-fit>${copy('完整显示','Fit entire image')}</button><button type="button" data-fill>${copy('填满头像','Fill avatar')}</button><button type="button" data-reset>${copy('重置','Reset')}</button></div><label>${copy('缩放','Zoom')}<input aria-label="${copy('头像缩放','Avatar zoom')}" type="range" min="1" max="6" step="0.01" value="1" data-range="zoom"></label><div class="avatar-live-preview"><span>${copy('最终效果','Final preview')}</span><canvas width="160" height="160" data-preview-large></canvas></div><div class="dialog-actions"><button type="button" data-cancel>${copy('取消','Cancel')}</button><button type="button" class="primary" data-save>${copy('确认裁剪','Apply crop')}</button></div>`;
  document.body.append(dialog);
  const canvas=dialog.querySelector('.avatar-crop-stage canvas'),ctx=canvas.getContext('2d'),output=document.createElement('canvas'),out=output.getContext('2d');output.width=output.height=640;
  const zoomInput=dialog.querySelector('[data-range=zoom]'),preview=dialog.querySelector('[data-preview-large]'),frame={x:64,y:64,w:512,h:512};
  let mode='contain',zoom=1,x=.5,y=.5,drag=null,pinch=null;const pointers=new Map();
  // "Fit" keeps every corner inside the final circle. "Fill" covers the
  // square output and intentionally allows edge cropping.
  const baseScale=()=>mode==='contain'?frame.w/Math.hypot(image.width,image.height):Math.max(frame.w/image.width,frame.h/image.height);
  const geometry=()=>{const scale=baseScale()*zoom,w=image.width*scale,h=image.height*scale;return {w,h,left:w>frame.w?frame.x-(w-frame.w)*x:frame.x+(frame.w-w)/2,top:h>frame.h?frame.y-(h-frame.h)*y:frame.y+(frame.h-h)/2};};
  function drawOutput(){const {w,h,left,top}=geometry(),scale=output.width/frame.w;out.fillStyle='#f3f0e8';out.fillRect(0,0,output.width,output.height);out.drawImage(image,(left-frame.x)*scale,(top-frame.y)*scale,w*scale,h*scale);const p=preview.getContext('2d');p.clearRect(0,0,preview.width,preview.height);p.drawImage(output,0,0,preview.width,preview.height);}
  function draw(){const {w,h,left,top}=geometry();ctx.fillStyle='#171421';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#f3f0e8';ctx.fillRect(frame.x,frame.y,frame.w,frame.h);ctx.drawImage(image,left,top,w,h);ctx.beginPath();ctx.rect(0,0,canvas.width,canvas.height);ctx.arc(canvas.width/2,canvas.height/2,frame.w/2,0,Math.PI*2);ctx.fillStyle='#050610b8';ctx.fill('evenodd');ctx.beginPath();ctx.arc(canvas.width/2,canvas.height/2,frame.w/2,0,Math.PI*2);ctx.strokeStyle='#ff4eb5';ctx.lineWidth=3;ctx.stroke();drawOutput();}
  function setPreset(next){mode=next;zoom=1;x=y=.5;zoomInput.value=1;dialog.querySelector('[data-fit]').setAttribute('aria-pressed',String(next==='contain'));dialog.querySelector('[data-fill]').setAttribute('aria-pressed',String(next==='cover'));draw();}
  function updateDrag(e){if(!drag)return;const {w,h}=geometry(),ratio=canvas.width/canvas.clientWidth;x=w>frame.w?clamp(drag.x-(e.clientX-drag.px)*ratio/(w-frame.w),0,1):.5;y=h>frame.h?clamp(drag.y-(e.clientY-drag.py)*ratio/(h-frame.h),0,1):.5;draw();}
  canvas.onwheel=e=>{e.preventDefault();zoom=clamp(zoom*Math.exp(-e.deltaY*.0015),1,6);zoomInput.value=zoom;draw();};
  canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1)drag={px:e.clientX,py:e.clientY,x,y};else if(pointers.size===2){const [a,b]=[...pointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom};drag=null;}};
  canvas.onpointermove=e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const [a,b]=[...pointers.values()];if(!pinch)pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom};zoom=clamp(pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,pinch.distance),1,6);zoomInput.value=zoom;draw();}else updateDrag(e);};
  const pointerEnd=e=>{pointers.delete(e.pointerId);pinch=null;const remaining=[...pointers.values()][0];drag=remaining?{px:remaining.x,py:remaining.y,x,y}:null;};canvas.onpointerup=pointerEnd;canvas.onpointercancel=pointerEnd;
  zoomInput.oninput=()=>{zoom=+zoomInput.value;draw();};dialog.querySelector('[data-fit]').onclick=()=>setPreset('contain');dialog.querySelector('[data-fill]').onclick=()=>setPreset('cover');dialog.querySelector('[data-reset]').onclick=()=>setPreset('contain');
  let done=false;const finish=value=>{if(done)return;done=true;dialog.close();dialog.remove();resolve(value);};dialog.querySelector('[data-cancel]').onclick=()=>finish(null);dialog.oncancel=e=>{e.preventDefault();finish(null);};dialog.querySelector('[data-save]').onclick=()=>{drawOutput();finish(output.toDataURL('image/jpeg',.88));};setPreset('contain');dialog.showModal();
 });
}

async function isHeic(file){
 if(/image\/hei[cf]/i.test(file.type)||/\.hei[cf]$/i.test(file.name))return true;
 try{const brand=new TextDecoder('ascii').decode(await file.slice(4,12).arrayBuffer());return /ftyp(?:heic|heix|hevc|hevx|heim|heis|mif1|msf1)/i.test(brand);}catch{return false;}
}

async function browserImage(file){
 if('createImageBitmap' in window){
  try{return await createImageBitmap(file,{imageOrientation:'from-image'});}catch{
   try{return await createImageBitmap(file);}catch{}
  }
 }
 const fromSource=source=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=source;});
 const url=URL.createObjectURL(file);
 try{return await fromSource(url);}catch{
  const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});
  return await fromSource(data);
 }finally{URL.revokeObjectURL(url);}
}

export async function cropImage(file,square=false){
 const heic=await isHeic(file),regular=['image/jpeg','image/png','image/webp'].includes(file.type)||/\.(?:jpe?g|png|webp)$/i.test(file.name);
 if((!heic&&!regular)||file.size>15*1024*1024)throw new Error(copy('请选择 15 MB 以内的 JPG、PNG、WebP、HEIC 或 HEIF 图片。','Choose a JPG, PNG, WebP, HEIC or HEIF image under 15 MB.'));
 let source=file;
 if(heic){
  try{const {default:heic2any}=await import('heic2any');const converted=await heic2any({blob:file,toType:'image/jpeg',quality:.92});source=Array.isArray(converted)?converted[0]:converted;}
  catch{throw new Error(copy('这张手机照片无法转换，请尝试在相册中导出为 JPG 后重新选择。','This phone photo could not be converted. Export it as JPG and try again.'));}
 }
 let image;
 try{
  image=await browserImage(source);
  if(!image.width||!image.height)throw new Error();
  if(image.width*image.height>30000000)throw new Error(copy('图片尺寸过大，请选择较小的图片。','The image is too large. Choose a smaller image.'));
  return await (square?avatarCrop(image):standardCrop(image));
 }catch(error){
  if(error?.message)throw error;
  throw new Error(copy('无法读取这张图片，请换一张或先保存为 JPG。','The image could not be read. Try another image or save it as JPG first.'));
 }finally{image?.close?.();}
}
