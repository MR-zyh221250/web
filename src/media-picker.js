export function cropImage(file, square=false){
 return new Promise((resolve,reject)=>{
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)return reject(new Error('请选择 10 MB 以内的 JPG、PNG 或 WebP 图片。'));
  const image=new Image(),url=URL.createObjectURL(file);image.onload=()=>{
   URL.revokeObjectURL(url);if(image.width*image.height>20000000)return reject(new Error('图片尺寸过大，请选择较小的图片。'));
   const dialog=document.createElement('dialog');dialog.className='crop-dialog';
   dialog.innerHTML=`<h2>裁剪图片</h2><p>拖动图片调整位置，也可使用下方滑块。</p><canvas width="640" height="${square?640:480}" aria-label="图片裁剪预览"></canvas><label>缩放<input aria-label="裁剪缩放" type="range" min="1" max="4" step="0.01" value="1" data-range="zoom"></label><label>左右位置<input aria-label="裁剪左右位置" type="range" min="0" max="1" step="0.01" value="0.5" data-range="x"></label><label>上下位置<input aria-label="裁剪上下位置" type="range" min="0" max="1" step="0.01" value="0.5" data-range="y"></label><div class="dialog-actions"><button type="button" data-cancel>取消</button><button type="button" class="primary" data-save>确认裁剪</button></div>`;
   document.body.append(dialog);const canvas=dialog.querySelector('canvas'),ctx=canvas.getContext('2d');let zoom=1,x=.5,y=.5,start;
   const geometry=()=>{const scale=Math.max(canvas.width/image.width,canvas.height/image.height)*zoom;return {w:image.width*scale,h:image.height*scale};};
   function draw(){const {w,h}=geometry();ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,-(w-canvas.width)*x,-(h-canvas.height)*y,w,h);}
   dialog.querySelectorAll('input').forEach(el=>el.oninput=()=>{zoom=+dialog.querySelector('[data-range=zoom]').value;x=+dialog.querySelector('[data-range=x]').value;y=+dialog.querySelector('[data-range=y]').value;draw();});
   canvas.onpointerdown=e=>{start={px:e.clientX,py:e.clientY,x,y};canvas.setPointerCapture(e.pointerId);};canvas.onpointerup=()=>start=null;
   canvas.onpointermove=e=>{if(!start)return;const {w,h}=geometry(),ratio=canvas.width/canvas.clientWidth;x=Math.max(0,Math.min(1,start.x-(e.clientX-start.px)*ratio/Math.max(1,w-canvas.width)));y=Math.max(0,Math.min(1,start.y-(e.clientY-start.py)*ratio/Math.max(1,h-canvas.height)));dialog.querySelector('[data-range=x]').value=x;dialog.querySelector('[data-range=y]').value=y;draw();};
   let done=false;const finish=value=>{if(done)return;done=true;dialog.close();dialog.remove();resolve(value);};dialog.querySelector('[data-cancel]').onclick=()=>finish(null);dialog.oncancel=e=>{e.preventDefault();finish(null);};dialog.querySelector('[data-save]').onclick=()=>finish(canvas.toDataURL('image/jpeg',.88));draw();dialog.showModal();
  };image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('无法读取图片。'));};image.src=url;
 });
}
