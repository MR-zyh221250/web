import {randomUUID} from 'node:crypto';
export function registerGuests(app,{pool,fail,text,username,password,passwordHash,transaction,throttle}){
 app.post('/api/register',async(req,res)=>{
  throttle('register:'+req.ip,8);
  const login=username(req.body),name=text(req.body,'name',50),phone=text(req.body,'phone',30),encoded=await passwordHash(password(req.body));
  const id=randomUUID(),customerId=randomUUID();
  await transaction(async c=>{
   const [[owner]]=await c.query("SELECT id FROM users WHERE role='admin' AND enabled=1 ORDER BY created_at LIMIT 1");if(!owner)fail(503,'暂未开放注册。');
   await c.execute("INSERT INTO users(id,username,name,password_hash,role,must_change) VALUES(?,?,?,?,'customer',0)",[id,login,name,encoded]);
   await c.execute("INSERT INTO customers(id,owner_id,name,phone,status) VALUES(?,?,?,?,'待联系')",[customerId,owner.id,name,phone]);
   await c.execute('INSERT INTO customer_accounts(user_id,customer_id) VALUES(?,?)',[id,customerId]);
  });res.status(201).json({ok:true});
 });
}
export function reservations(app,{pool,fail,text,transaction,versionCheck}){
 app.get('/api/reservations',async(req,res)=>{
  const role=req.user.role;
  const where=role==='admin'?'1=1':role==='customer'?'r.user_id=?':role==='shop'?'s.owner_id=?':'c.owner_id=?';
  const [rows]=await pool.execute(`SELECT r.id,r.advert_id AS advertId,r.shop_id AS shopId,r.requested_at AS requestedAt,r.message,r.reply,r.status,r.version,a.title,a.title_en AS titleEn,s.name AS shopName,c.name AS customerName,c.phone FROM reservations r JOIN adverts a ON a.id=r.advert_id JOIN shops s ON s.id=r.shop_id JOIN customer_accounts ca ON ca.user_id=r.user_id JOIN customers c ON c.id=ca.customer_id WHERE ${where} ORDER BY r.created_at DESC`,role==='admin'?[]:[req.user.id]);res.json(rows);
 });
 app.post('/api/reservations',async(req,res)=>{
  if(req.user.role!=='customer')fail(403,'请使用客人账号预约。');
  const advertId=text(req.body,'advertId',36),message=text(req.body,'message',2000),date=text(req.body,'requestedAt',30);
  const time=Date.parse(date);if(!Number.isFinite(time)||time<Date.now()||time>Date.now()+180*86400000)fail(400,'请选择未来 180 天内的预约时间。');
  const id=randomUUID();await transaction(async c=>{
   await c.execute('SELECT id FROM users WHERE id=? FOR UPDATE',[req.user.id]);
   const [[a]]=await c.execute("SELECT a.*,s.enabled,u.enabled AS owner_enabled FROM adverts a JOIN shops s ON s.id=a.shop_id JOIN users u ON u.id=s.owner_id WHERE a.id=? FOR UPDATE",[advertId]);
   if(!a||a.status!=='published'||!a.enabled||!a.owner_enabled||(a.expires_on&&a.expires_on<new Date(Date.now()+8*3600000).toISOString().slice(0,10)))fail(404,'广告已下架或过期，不能预约。');
   const [[{count}]]=await c.execute("SELECT COUNT(*) count FROM reservations WHERE user_id=? AND advert_id=? AND status IN ('pending','confirmed')",[req.user.id,advertId]);if(count)fail(409,'你已有该广告的待处理预约，请在我的预约中查看。');
   await c.execute('INSERT INTO reservations(id,user_id,advert_id,shop_id,requested_at,message) VALUES(?,?,?,?,?,?)',[id,req.user.id,advertId,a.shop_id,new Date(time).toISOString().slice(0,19).replace('T',' '),message]);
  });res.status(201).json({id});
 });
 app.patch('/api/reservations/:id',async(req,res)=>{
  const status=text(req.body,'status',20),reply=text(req.body,'reply',2000,false);
  await transaction(async c=>{
   const [[r]]=await c.execute('SELECT r.*,s.owner_id FROM reservations r JOIN shops s ON s.id=r.shop_id WHERE r.id=? FOR UPDATE',[req.params.id]);
   const guest=req.user.role==='customer';
   if(!r||(guest?r.user_id!==req.user.id:!(req.user.role==='admin'||(req.user.role==='shop'&&r.owner_id===req.user.id))))fail(404,'预约不存在或无权处理。');
   versionCheck(req.body,r);
   const valid=guest?['pending','confirmed'].includes(r.status)&&status==='cancelled':(r.status==='pending'&&['confirmed','cancelled'].includes(status))||(r.status==='confirmed'&&['completed','cancelled'].includes(status));
   if(!valid)fail(409,'当前预约状态不允许此操作。');
   await c.execute('UPDATE reservations SET status=?,reply=?,version=version+1 WHERE id=?',[status,guest?r.reply:reply,r.id]);
  });res.json({ok:true});
 });
}
