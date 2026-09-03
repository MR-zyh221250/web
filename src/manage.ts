import './manage.css';
type User={id:string;username:string;name:string;role:'admin'|'sales';enabled:boolean;mustChange:boolean};
type Customer={id:string;ownerId:string;ownerName:string;name:string;company:string;phone:string;status:string;version:number};
type Sale={id:string;customerId:string;item:string;cents:number;date:string;version:number};
type View='customers'|'sales'|'users';
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const esc=(v:string)=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const money=(n:number)=>(n/100).toLocaleString('zh-CN',{style:'currency',currency:'CNY'});
let user:User|null=null,users:User[]=[],data:{customers:Customer[];sales:Sale[]}={customers:[],sales:[]};
let view:View='customers',editing:string|null=null,pending:{id:string;view:View;version:number}|null=null;
const editor=$<HTMLDialogElement>('editor'),passwordDialog=$<HTMLDialogElement>('password-dialog'),deletion=$<HTMLDialogElement>('delete-dialog');
function loggedOut(){user=null;data={customers:[],sales:[]};users=[];for(const d of [editor,passwordDialog,deletion])d.close();$('workspace').hidden=true;$('auth-gate').hidden=false;$('table-body').innerHTML='';}
async function api(path:string,method='GET',body?:unknown){
 const r=await fetch('/api'+path,{method,credentials:'same-origin',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const result=await r.json().catch(()=>({error:'服务器连接异常，请稍后重试。'}));
 if(!r.ok){if(r.status===401&&path!=='/login')loggedOut();throw new Error(result.error||'操作失败。');}return result;
}
async function busy(form:HTMLElement,action:()=>Promise<void>,errorId:string){
 const buttons=form.querySelectorAll<HTMLButtonElement>('button[type="submit"]');buttons.forEach(b=>b.disabled=true);$(errorId).textContent='';
 try{await action();}catch(e){$(errorId).textContent=(e as Error).message;}finally{buttons.forEach(b=>b.disabled=false);}
}
function passwordForm(){ $('password-error').textContent='';$<HTMLFormElement>('password-form').reset();$('password-note').textContent=user?.mustChange?'首次登录需要修改临时密码，修改后请重新登录。':'修改后所有设备将退出登录。';$('password-cancel').hidden=!!user?.mustChange;passwordDialog.showModal();}
async function enter(){
 $('auth-gate').hidden=true;$('workspace').hidden=false;
 $('identity').textContent=`${user!.name} · ${user!.role==='admin'?'管理员':'销售员'}`;
 $('users-nav').hidden=user!.role!=='admin';view='customers';
 if(user!.mustChange){passwordForm();return;}await refresh();
}
async function refresh(){data=await api('/data');if(user?.role==='admin')users=await api('/users');render();}
function render(){
 $('customer-count').textContent=String(data.customers.length);$('sale-count').textContent=String(data.sales.length);$('sale-total').textContent=money(data.sales.reduce((n,s)=>n+s.cents,0));
 $('section-title').textContent={customers:'客户管理',sales:'销售记录',users:'销售员账号'}[view];$('add').textContent='新增'+{customers:'客户',sales:'销售',users:'账号'}[view];
 document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
 $<HTMLInputElement>('search').placeholder={customers:'搜索姓名、公司、电话…',sales:'搜索客户、销售项目…',users:'搜索账号、姓名…'}[view];
 const q=$<HTMLInputElement>('search').value.trim().toLowerCase();
 const cells=(v:string[])=>v.map(s=>`<td>${esc(s)}</td>`).join('');
 const actions=(id:string,remove=true)=>`<td><button data-edit="${esc(id)}">编辑</button>${remove?`<button class="danger" data-delete="${esc(id)}">删除</button>`:''}</td>`;
 let headers:string[],rows:string[];
 if(view==='customers'){
  headers=['客户姓名','公司','联系电话','跟进状态','负责人','操作'];
  rows=data.customers.filter(c=>`${c.name} ${c.company} ${c.phone} ${c.ownerName}`.toLowerCase().includes(q)).map(c=>`<tr>${cells([c.name,c.company||'—',c.phone||'—',c.status,c.ownerName])}${actions(c.id)}</tr>`);
 }else if(view==='sales'){
  headers=['客户','销售项目','金额','日期','操作'];
  rows=data.sales.map(s=>({...s,customer:data.customers.find(c=>c.id===s.customerId)?.name||'未知客户'})).filter(s=>`${s.customer} ${s.item}`.toLowerCase().includes(q)).map(s=>`<tr>${cells([s.customer,s.item,money(s.cents),s.date])}${actions(s.id)}</tr>`);
 }else{
  headers=['账号','姓名','角色','状态','操作'];
  rows=users.filter(u=>`${u.username} ${u.name}`.toLowerCase().includes(q)).map(u=>`<tr>${cells([u.username,u.name,u.role==='admin'?'管理员':'销售员',u.enabled?'正常':'已停用'])}${u.role==='sales'?actions(u.id,false):'<td>当前管理员</td>'}</tr>`);
 }
 $('table-head').innerHTML='<tr>'+headers.map(h=>`<th scope="col">${h}</th>`).join('')+'</tr>';$('table-body').innerHTML=rows.join('');
 $('empty').hidden=rows.length>0;$('empty').textContent=q?'没有找到匹配记录。':'暂无记录，点击右上方按钮开始添加。';
}
const field=(name:string,label:string,value='',extra='')=>`<label>${label}<input name="${name}" value="${esc(value)}" ${extra}></label>`;
function openEditor(id:string|null=null){
 if(view==='sales'&&!data.customers.length){$('notice').textContent='请先新增客户，再记录销售。';return;}
 editing=id;$('form-error').textContent='';$('dialog-title').textContent=(id?'编辑':'新增')+{customers:'客户',sales:'销售',users:'销售员账号'}[view];
 if(view==='customers'){
  const c=data.customers.find(c=>c.id===id);
  $('fields').innerHTML=field('name','客户姓名 *',c?.name,'required maxlength="50"')+field('company','公司',c?.company,'maxlength="100"')+field('phone','联系电话',c?.phone,'type="tel" maxlength="30"')+`<label>跟进状态<select name="status">${['待联系','跟进中','已成交'].map(s=>`<option${s===c?.status?' selected':''}>${s}</option>`).join('')}</select></label>`+(user?.role==='admin'?`<label>负责人<select name="ownerId">${users.filter(u=>u.enabled||u.id===c?.ownerId).map(u=>`<option value="${u.id}"${u.id===(c?.ownerId||user?.id)?' selected':''}>${esc(u.name)}${u.enabled?'':'（已停用）'}</option>`).join('')}</select></label>`:'');
 }else if(view==='sales'){
  const s=data.sales.find(s=>s.id===id),now=new Date(),date=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  $('fields').innerHTML=`<label>客户 *<select name="customerId">${data.customers.map(c=>`<option value="${c.id}"${c.id===s?.customerId?' selected':''}>${esc(c.name)}</option>`).join('')}</select></label>`+field('item','销售项目 *',s?.item,'required maxlength="100"')+field('amount','金额（元）*',s?(s.cents/100).toFixed(2):'','type="number" required min="0.01" max="999999999" step="0.01"')+field('date','销售日期 *',s?.date||date,'type="date" required min="2000-01-01" max="2100-12-31"');
 }else{
  const u=users.find(u=>u.id===id);
  $('fields').innerHTML=field('username','登录账号 *',u?.username,id?'disabled':'required minlength="3" maxlength="40" autocomplete="off"')+field('name','姓名 *',u?.name,'required maxlength="50"')+field('password',id?'重置临时密码（留空则不修改）':'临时密码 *','','type="password" minlength="10" maxlength="128" autocomplete="new-password" '+(id?'':'required'))+(id?`<label>账号状态<select name="enabled"><option value="true"${u?.enabled?' selected':''}>正常</option><option value="false"${!u?.enabled?' selected':''}>停用</option></select></label>`:'')+'<p class="storage-note">销售员只能访问自己负责的客户。临时密码在首次登录时必须修改。</p>';
 }editor.showModal();
}
$('login-form').addEventListener('submit',e=>{e.preventDefault();void busy(e.target as HTMLElement,async()=>{const f=new FormData(e.target as HTMLFormElement);const result=await api('/login','POST',{username:f.get('username'),password:f.get('password')});user=result.user;$<HTMLFormElement>('login-form').reset();await enter();},'login-error');});
$('logout').addEventListener('click',()=>void busy($('workspace'),async()=>{await api('/logout','POST',{});loggedOut();},'notice'));
$('change-password').addEventListener('click',passwordForm);
passwordDialog.addEventListener('cancel',e=>{if(user?.mustChange)e.preventDefault();});
$('password-cancel').addEventListener('click',()=>passwordDialog.close());
$('password-form').addEventListener('submit',e=>{e.preventDefault();void busy(e.target as HTMLElement,async()=>{const f=new FormData(e.target as HTMLFormElement);if(f.get('newPassword')!==f.get('confirmPassword'))throw new Error('两次输入的新密码不一致。');await api('/password','POST',{oldPassword:f.get('oldPassword'),newPassword:f.get('newPassword')});loggedOut();$('login-error').textContent='密码已更新，请使用新密码登录。';},'password-error');});
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view as View;$<HTMLInputElement>('search').value='';$('notice').textContent='';render();}));
$('refresh').addEventListener('click',()=>void busy($('workspace'),refresh,'notice'));
$('search').addEventListener('input',render);$('add').addEventListener('click',()=>openEditor());
for(const id of ['close','cancel'])$(id).addEventListener('click',()=>editor.close());
$('table-body').addEventListener('click',e=>{
 const b=(e.target as HTMLElement).closest<HTMLButtonElement>('button');if(!b)return;if(b.dataset.edit){openEditor(b.dataset.edit);return;}
 const id=b.dataset.delete;if(!id||view==='users')return;
 const row=(view==='customers'?data.customers:data.sales).find(r=>r.id===id);if(!row)return;
 pending={id,view,version:row.version};$('delete-prompt').textContent='确定删除这条记录吗？删除后无法撤销。';$('delete-error').textContent='';deletion.showModal();
});
$('delete-cancel').addEventListener('click',()=>deletion.close());
$('delete-confirm').addEventListener('click',()=>void busy(deletion,async()=>{if(!pending)return;await api('/'+pending.view+'/'+pending.id,'DELETE',{version:pending.version});pending=null;deletion.close();await refresh();$('notice').textContent='记录已删除。';},'delete-error'));
$('record-form').addEventListener('submit',e=>{
 e.preventDefault();void busy(e.target as HTMLElement,async()=>{
  const f=new FormData(e.target as HTMLFormElement),get=(k:string)=>String(f.get(k)||'').trim();let body:Record<string,unknown>;
  if(view==='customers'){const c=data.customers.find(c=>c.id===editing);body={name:get('name'),company:get('company'),phone:get('phone'),status:get('status'),ownerId:user?.role==='admin'?get('ownerId'):user?.id,version:c?.version};}
  else if(view==='sales'){const s=data.sales.find(s=>s.id===editing);body={customerId:get('customerId'),item:get('item'),cents:Math.round(Number(get('amount'))*100),date:get('date'),version:s?.version};}
  else body={username:get('username'),name:get('name'),password:String(f.get('password')||''),enabled:get('enabled')==='true'};
  await api('/'+view+(editing?'/'+editing:''),editing?(view==='users'?'PATCH':'PUT'):'POST',body);editor.close();await refresh();$('notice').textContent='已保存到服务器。';
 },'form-error');
});
api('/me').then(async r=>{user=r.user;await enter();}).catch(e=>{loggedOut();if(!String(e.message).includes('登录'))$('login-error').textContent=e.message;});
