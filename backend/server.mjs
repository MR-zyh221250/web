import {migrateCommerce,categories,saleOptions,shopSales,linkSale} from './commerce.mjs';
import {registerGuests,reservations} from './reservations.mjs';
import {migrateMarket,publicMarket,privateMarket} from './market.mjs';
import express from 'express';
import mysql from 'mysql2/promise';
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { readFileSync } from 'node:fs';
const scrypt = promisify(scryptCallback);
const secret = key => process.env[key+'_FILE'] ? readFileSync(process.env[key+'_FILE'],'utf8').trim() : process.env[key];
const pool = mysql.createPool({host:process.env.DB_HOST||'db', user:process.env.DB_USER||'neon', password:secret('DB_PASSWORD'), database:process.env.DB_NAME||'neon', connectionLimit:5, charset:'utf8mb4', dateStrings:true, timezone:'Z'});
const hash = s => createHash('sha256').update(s).digest('hex');
async function passwordHash(password) {
 const salt=randomBytes(16).toString('hex');
 return salt+':'+(await scrypt(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024})).toString('hex');
}
async function verify(password, encoded) {
 const [salt,value]=encoded.split(':');
 const actual=await scrypt(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024});
 return timingSafeEqual(actual,Buffer.from(value,'hex'));
}
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
function text(body,key,max,required=true) { const v=body?.[key]; if(typeof v!=='string'||v.length>max||(required&&!v.trim())) fail(400,'请检查输入内容：'+key); return v.trim(); }
function password(body,key='password') { const v=body?.[key]; if(typeof v!=='string'||v.length<10||v.length>128) fail(400,'密码需为 10～128 个字符。'); return v; }
function username(body) {const v=text(body,'username',40).normalize('NFKC').toLowerCase(); if(!/^[\p{L}\p{N}_][\p{L}\p{N}_.-]{2,39}$/u.test(v)) fail(400,'账号需为 3～40 位中文、字母、数字或 . _ -');return v;}
const publicUser=u=>({id:u.id,username:u.username,name:u.name,role:u.role,enabled:!!u.enabled,mustChange:!!u.must_change});
const cookieOptions={httpOnly:true,secure:process.env.COOKIE_SECURE!=='false',sameSite:'strict',path:'/api',maxAge:8*3600*1000};
const app=express(); app.disable('x-powered-by'); app.set('trust proxy',1);
app.use('/api',(_req,res,next)=>{res.set('Cache-Control','no-store');res.set('X-Content-Type-Options','nosniff');next();});
app.use(express.json({limit:'2mb'}));
const allowedOrigins=[process.env.PUBLIC_ORIGIN,process.env.MERCHANT_ORIGIN,process.env.FRONT_ORIGIN].filter(Boolean);
app.use('/api',(req,res,next)=>{
 if(!['GET','HEAD','OPTIONS'].includes(req.method)) {
  if(!allowedOrigins.includes(req.get('origin'))) return res.status(403).json({error:'请求来源不匹配，请重新打开网站。'});
  if(!req.is('application/json')) return res.status(415).json({error:'仅接受 JSON 请求。'});
 }
 next();
});
app.get('/api/health',async(_req,res)=>{await pool.query('SELECT 1');res.json({ok:true});});
// Bounded in-memory attempt windows; persistent sessions are kept in MySQL.
const attempts=new Map();
function throttle(key,max) {
 const now=Date.now(); let a=attempts.get(key);
 if(!a||a.until<now){if(attempts.size>10000) for(const [k,v] of attempts) if(v.until<now) attempts.delete(k); if(attempts.size>10000) fail(429,'请求过多，请稍后重试。');a={count:0,until:now+15*60*1000};attempts.set(key,a);}
 if(++a.count>max) fail(429,'尝试过于频繁，请 15 分钟后重试。');
}
app.post('/api/login',async(req,res)=>{
 throttle('ip:'+req.ip,60);
 const login=username(req.body);throttle('user:'+login,15);
 const pw=password(req.body);
 const [[u]]=await pool.execute('SELECT * FROM users WHERE username=?',[login]);
 if(!await verify(pw,u?.password_hash||dummyHash)||!u?.enabled) fail(401,'账号或密码错误。');
 const origin=req.get('origin');
 if(process.env.FRONT_ORIGIN&&origin===process.env.FRONT_ORIGIN&&u.role!=='customer')fail(403,'店铺和员工请使用各自的独立后台登录。');
 if(process.env.MERCHANT_ORIGIN&&origin===process.env.MERCHANT_ORIGIN&&u.role!=='shop')fail(403,'此地址仅供商户登录，请前往平台管理后台。');
 if(process.env.MERCHANT_ORIGIN&&process.env.PUBLIC_ORIGIN&&origin===process.env.PUBLIC_ORIGIN&&u.role==='shop')fail(403,'商户请前往独立的商户工作台登录。');
 const token=randomBytes(32).toString('hex');
 await transaction(async c=>{
  const [[current]]=await c.execute('SELECT enabled,password_hash FROM users WHERE id=? FOR UPDATE',[u.id]);
  if(!current?.enabled||current.password_hash!==u.password_hash) fail(401,'账号状态已更新，请重新登录。');
  await c.execute('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR))',[hash(token),u.id]);
 });
 res.cookie('neon_session',token,cookieOptions).json({user:publicUser(u)});
});
registerGuests(app,{pool,fail,text,username,password,passwordHash,transaction,throttle});
publicMarket(app,{pool,fail});
app.use('/api',async(req,res,next)=>{
 const token=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('neon_session='))?.slice(13);
 if(!token||!/^[0-9a-f]{64}$/.test(token)) return res.status(401).json({error:'请先登录。'});
 const [[u]]=await pool.execute('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP() AND u.enabled=1',[hash(token)]);
 if(!u) return res.status(401).json({error:'登录已过期，请重新登录。'});
 req.user=u;req.tokenHash=hash(token);next();
});
app.get('/api/me',async(req,res)=>{const user=publicUser(req.user);if(req.user.role==='customer'){const [[c]]=await pool.execute('SELECT c.id AS customerId,c.phone,c.version AS customerVersion,v.media_id AS avatarId FROM customer_accounts ca JOIN customers c ON c.id=ca.customer_id LEFT JOIN customer_avatars v ON v.customer_id=c.id WHERE ca.user_id=?',[req.user.id]);Object.assign(user,c||{});}res.json({user});});
app.post('/api/logout',async(req,res)=>{await pool.execute('DELETE FROM sessions WHERE token_hash=?',[req.tokenHash]);res.clearCookie('neon_session',cookieOptions).json({ok:true});});
app.post('/api/password',async(req,res)=>{
 throttle('password:'+req.user.id,10);
 const old=password(req.body,'oldPassword'), fresh=password(req.body,'newPassword');
 if(!await verify(old,req.user.password_hash)) fail(400,'原密码错误。');
 if(old===fresh) fail(400,'新密码不能与原密码相同。');
 const encoded=await passwordHash(fresh);
 await transaction(async c=>{const [result]=await c.execute('UPDATE users SET password_hash=?,must_change=0 WHERE id=? AND password_hash=?',[encoded,req.user.id,req.user.password_hash]);if(!result.affectedRows)fail(409,'密码已被更新，请重新登录。');await c.execute('DELETE FROM sessions WHERE user_id=?',[req.user.id]);});
 res.clearCookie('neon_session',cookieOptions).json({ok:true});
});
app.use('/api',(req,res,next)=>req.user.must_change?res.status(403).json({error:'首次登录请先修改密码。',code:'PASSWORD_CHANGE_REQUIRED'}):next());
const admin=(req,_res,next)=>{if(req.user.role!=='admin') fail(403,'需要管理员权限。');next();};
app.get('/api/users',admin,async(_req,res)=>{const [rows]=await pool.query('SELECT * FROM users ORDER BY created_at');res.json(rows.map(publicUser));});
app.post('/api/users',admin,async(req,res)=>{
 const login=username(req.body),name=text(req.body,'name',50),encoded=await passwordHash(password(req.body));
 const role=req.body.role||'sales';if(!['sales','shop'].includes(role))fail(400,'账号角色无效。');
 const id=randomUUID();await pool.execute('INSERT INTO users(id,username,name,password_hash,role) VALUES(?,?,?,?,?)',[id,login,name,encoded,role]);res.status(201).json({id});
});
app.patch('/api/users/:id',admin,async(req,res)=>{
 if(req.params.id===req.user.id) fail(400,'请通过修改密码管理自己的账号。');
 const name=text(req.body,'name',50);if(typeof req.body.enabled!=='boolean') fail(400,'账号状态无效。');
 const encoded=req.body.password?await passwordHash(password(req.body)):null;
 await transaction(async c=>{
  const [[u]]=await c.execute("SELECT id FROM users WHERE id=? AND role IN ('sales','shop') FOR UPDATE",[req.params.id]);if(!u) fail(404,'账号不存在。');
  await c.execute('UPDATE users SET name=?,enabled=? WHERE id=?',[name,req.body.enabled,req.params.id]);
  if(encoded) await c.execute('UPDATE users SET password_hash=?,must_change=1 WHERE id=?',[encoded,req.params.id]);
  if(encoded||!req.body.enabled) await c.execute('DELETE FROM sessions WHERE user_id=?',[req.params.id]);
 });res.json({ok:true});
});
reservations(app,{pool,fail,text,transaction,versionCheck});
// Media and avatar routes perform their own role and ownership checks. Register
// them before the customer-wide management guard so guests can manage only
// their own profile avatar; the remaining market routes reject customers via
// their `market` middleware.
privateMarket(app,{pool,fail,text,transaction,versionCheck});
app.use('/api',(req,res,next)=>req.user.role==='customer'?res.status(403).json({error:'客人账号不能访问管理功能。'}):next());
categories(app,{pool,fail,text,transaction,versionCheck});
shopSales(app,{pool,fail,text,transaction,versionCheck});
app.use('/api',(req,res,next)=>req.user.role==='shop'?res.status(403).json({error:'店铺账号不能访问客户销售资料。'}):next());
saleOptions(app,{pool});
const customerColumns='c.id,c.owner_id AS ownerId,u.name AS ownerName,c.name,c.company,c.phone,c.status,c.version,(SELECT media_id FROM customer_avatars WHERE customer_id=c.id) AS avatarId';
app.get('/api/data',async(req,res)=>{
 const scoped=req.user.role!=='admin',args=scoped?[req.user.id]:[];
 const [customers]=await pool.execute(`SELECT ${customerColumns} FROM customers c JOIN users u ON u.id=c.owner_id ${scoped?'WHERE c.owner_id=?':''} ORDER BY c.created_at DESC`,args);
 const [sales]=await pool.execute(`SELECT s.id,s.customer_id AS customerId,s.item,s.cents,s.date,s.version,l.shop_id AS shopId,l.advert_id AS advertId,l.reservation_id AS reservationId,sh.name AS shopName,a.title AS advertTitle FROM sales s JOIN customers c ON c.id=s.customer_id LEFT JOIN sale_links l ON l.sale_id=s.id LEFT JOIN shops sh ON sh.id=l.shop_id LEFT JOIN adverts a ON a.id=l.advert_id ${scoped?'WHERE c.owner_id=?':''} ORDER BY s.date DESC,s.created_at DESC`,args);
 res.json({customers,sales});
});
async function transaction(fn){const c=await pool.getConnection();try{await c.beginTransaction();const result=await fn(c);await c.commit();return result;}catch(e){await c.rollback();throw e;}finally{c.release();}}
async function ownedCustomer(c,id,user){const [[row]]=await c.execute('SELECT * FROM customers WHERE id=? FOR UPDATE',[id]);if(!row||(user.role!=='admin'&&row.owner_id!==user.id)) fail(404,'客户不存在或无权访问。');return row;}
function versionCheck(body,row){if(!Number.isInteger(body.version)||body.version!==row.version) fail(409,'记录已被其他操作更新，请刷新后重试。');}
for(const method of ['post','put']) app[method]('/api/customers'+(method==='put'?'/:id':''),async(req,res)=>{
 const name=text(req.body,'name',50),company=text(req.body,'company',100,false),phone=text(req.body,'phone',30,false),status=text(req.body,'status',10);
 if(!['待联系','跟进中','已成交'].includes(status)) fail(400,'跟进状态无效。');
 const ownerId=req.user.role==='admin'?text(req.body,'ownerId',36):req.user.id;
 const id=req.params.id||randomUUID();
 await transaction(async c=>{
  if(method==='put')versionCheck(req.body,await ownedCustomer(c,id,req.user));
  const [[owner]]=await c.execute("SELECT id FROM users WHERE id=? AND enabled=1 AND role IN ('admin','sales')",[ownerId]);if(!owner) fail(400,'请选择有效负责人。');
  if(method==='post')await c.execute('INSERT INTO customers(id,owner_id,name,company,phone,status) VALUES(?,?,?,?,?,?)',[id,ownerId,name,company,phone,status]);
  else await c.execute('UPDATE customers SET owner_id=?,name=?,company=?,phone=?,status=?,version=version+1 WHERE id=?',[ownerId,name,company,phone,status,id]);
 });res.status(method==='post'?201:200).json({id});
});
app.delete('/api/customers/:id',async(req,res)=>{
 await transaction(async c=>{versionCheck(req.body,await ownedCustomer(c,req.params.id,req.user));await c.execute('DELETE FROM customers WHERE id=?',[req.params.id]);});res.json({ok:true});
});
for(const method of ['post','put']) app[method]('/api/sales'+(method==='put'?'/:id':''),async(req,res)=>{
 const customerId=text(req.body,'customerId',36),item=text(req.body,'item',100),date=text(req.body,'date',10),cents=req.body.cents;
 if(!Number.isSafeInteger(cents)||cents<=0||cents>99999999900)fail(400,'销售金额无效。');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date<'2000-01-01'||date>'2100-12-31'||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date) fail(400,'日期无效。');
 const id=req.params.id||randomUUID();
 await transaction(async c=>{
  let oldSale=null;
  if(method==='put'){
   const [[s]]=await c.execute('SELECT * FROM sales WHERE id=? FOR UPDATE',[id]);if(!s)fail(404,'销售记录不存在。');
   await ownedCustomer(c,s.customer_id,req.user);versionCheck(req.body,s);oldSale=s;
  }
  await ownedCustomer(c,customerId,req.user);
  const link=await linkSale(c,{body:req.body,user:req.user,customerId,oldSale,fail,versionCheck});
  if(method==='post')await c.execute('INSERT INTO sales(id,customer_id,item,cents,date) VALUES(?,?,?,?,?)',[id,customerId,item,cents,date]);
  else await c.execute('UPDATE sales SET customer_id=?,item=?,cents=?,date=?,version=version+1 WHERE id=?',[customerId,item,cents,date,id]);
  await c.execute('INSERT INTO sale_links(sale_id,shop_id,advert_id,reservation_id) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE shop_id=VALUES(shop_id),advert_id=VALUES(advert_id)',[id,link.shopId,link.advertId,link.reservationId]);
 });res.status(method==='post'?201:200).json({id});
});
app.delete('/api/sales/:id',async(req,res)=>{
 await transaction(async c=>{const [[s]]=await c.execute('SELECT * FROM sales WHERE id=? FOR UPDATE',[req.params.id]);if(!s)fail(404,'销售记录不存在。');await ownedCustomer(c,s.customer_id,req.user);versionCheck(req.body,s);await c.execute('DELETE FROM sales WHERE id=?',[s.id]);});res.json({ok:true});
});
app.use('/api',(_req,res)=>res.status(404).json({error:'接口不存在。'}));
app.use((e,_req,res,_next)=>{
 let status=e.status||500,message=e.status?e.message:'服务暂时不可用，请稍后重试。';
 if(e.code==='ER_DUP_ENTRY'){status=409;message='账号已存在。';}
 if(e.code==='ER_ROW_IS_REFERENCED_2'){status=409;message='记录已有关联资料，不能删除。可先下架、停用或处理关联记录。';}
 if(e.code==='ER_LOCK_DEADLOCK'){status=409;message='记录正在更新，请刷新后重试。';}
 if(status>=500)console.error('API error',e.code||e.name);
 res.status(status).json({error:message});
});
for(const sql of readFileSync(new URL('./schema.sql',import.meta.url),'utf8').split(';').filter(s=>s.trim()))await pool.query(sql);
await migrateMarket(pool);
await migrateCommerce(pool);
const dummyHash=await passwordHash(randomBytes(32).toString('hex'));
if(process.argv.includes('--bootstrap')) {
 const [[{count}]]=await pool.query("SELECT COUNT(*) AS count FROM users WHERE role='admin'");
 if(count)fail(409,'管理员已存在。');
 const input=JSON.parse(readFileSync(0,'utf8'));
 await pool.execute("INSERT INTO users(id,username,name,password_hash,role) VALUES(?,?,?,?,'admin')",[randomUUID(),username(input),text(input,'name',50),await passwordHash(password(input))]);
 console.log('Administrator created; password change required.');await pool.end();
} else {
 await pool.query('DELETE FROM sessions WHERE expires_at<UTC_TIMESTAMP()');
 const cleanup=setInterval(()=>pool.query('DELETE FROM sessions WHERE expires_at<UTC_TIMESTAMP()').catch(()=>{}),3600000);cleanup.unref();
 const server=app.listen(3000,'0.0.0.0',()=>console.log('CRM API ready'));
 process.on('SIGTERM',()=>server.close(async()=>{await pool.end();process.exit(0);}));
}
