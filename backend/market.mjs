import sharp from 'sharp';
import {randomUUID} from 'node:crypto';

export async function migrateMarket(pool){
 const [[column]]=await pool.query("SHOW COLUMNS FROM users LIKE 'role'");
 if(!column.Type.includes("'customer'"))await pool.query("ALTER TABLE users MODIFY role ENUM('admin','sales','shop','customer') NOT NULL DEFAULT 'sales'");
 for(const sql of [
 `CREATE TABLE IF NOT EXISTS media (id CHAR(36) PRIMARY KEY, owner_id CHAR(36) NOT NULL, purpose ENUM('avatar','advert') NOT NULL, bytes MEDIUMBLOB NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(owner_id) REFERENCES users(id)) ENGINE=InnoDB`,
 `CREATE TABLE IF NOT EXISTS customer_avatars (customer_id CHAR(36) PRIMARY KEY, media_id CHAR(36) NOT NULL, FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE, FOREIGN KEY(media_id) REFERENCES media(id)) ENGINE=InnoDB`,
 `CREATE TABLE IF NOT EXISTS shops (id CHAR(36) PRIMARY KEY, owner_id CHAR(36) NOT NULL, name VARCHAR(80) NOT NULL, name_en VARCHAR(120) NOT NULL DEFAULT '', description TEXT NOT NULL, description_en TEXT NOT NULL, phone VARCHAR(40) NOT NULL DEFAULT '', wechat VARCHAR(80) NOT NULL DEFAULT '', address VARCHAR(200) NOT NULL DEFAULT '', enabled BOOLEAN NOT NULL DEFAULT TRUE, version INT NOT NULL DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX(owner_id), FOREIGN KEY(owner_id) REFERENCES users(id)) ENGINE=InnoDB`,
 `CREATE TABLE IF NOT EXISTS adverts (id CHAR(36) PRIMARY KEY, shop_id CHAR(36) NOT NULL, title VARCHAR(120) NOT NULL, title_en VARCHAR(160) NOT NULL DEFAULT '', body TEXT NOT NULL, body_en TEXT NOT NULL, category VARCHAR(40) NOT NULL, images JSON NOT NULL, status ENUM('draft','pending','published','offline','rejected') NOT NULL DEFAULT 'draft', pinned BOOLEAN NOT NULL DEFAULT FALSE, expires_on DATE NULL, review_note VARCHAR(500) NOT NULL DEFAULT '', version INT NOT NULL DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, INDEX(shop_id), INDEX(status), FOREIGN KEY(shop_id) REFERENCES shops(id) ON DELETE RESTRICT) ENGINE=InnoDB`
,
 `CREATE TABLE IF NOT EXISTS customer_accounts (user_id CHAR(36) PRIMARY KEY, customer_id CHAR(36) NOT NULL UNIQUE, FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE RESTRICT) ENGINE=InnoDB`,
 `CREATE TABLE IF NOT EXISTS reservations (id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL, advert_id CHAR(36) NOT NULL, shop_id CHAR(36) NOT NULL, requested_at DATETIME NOT NULL, message VARCHAR(2000) NOT NULL, reply VARCHAR(2000) NOT NULL DEFAULT '', status ENUM('pending','confirmed','completed','cancelled') NOT NULL DEFAULT 'pending', version INT NOT NULL DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX(user_id), INDEX(shop_id), FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(advert_id) REFERENCES adverts(id) ON DELETE RESTRICT, FOREIGN KEY(shop_id) REFERENCES shops(id)) ENGINE=InnoDB`
 ])await pool.query(sql);
}
const shopFields='s.id,s.owner_id AS ownerId,s.name,s.name_en AS nameEn,s.description,s.description_en AS descriptionEn,s.phone,s.wechat,s.address,s.enabled,s.version';
const adFields='a.id,a.shop_id AS shopId,a.title,a.title_en AS titleEn,a.body,a.body_en AS bodyEn,a.category,a.images,a.status,a.pinned,a.expires_on AS expiresOn,a.review_note AS reviewNote,a.version,a.updated_at AS updatedAt';
const publicJoin='FROM adverts a JOIN shops s ON s.id=a.shop_id JOIN users u ON u.id=s.owner_id LEFT JOIN advert_categories ac ON ac.id=a.category';
const visible="a.status='published' AND (a.expires_on IS NULL OR a.expires_on>=DATE(DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR))) AND s.enabled=1 AND u.enabled=1";
const normalize=a=>({...a,images:typeof a.images==='string'?JSON.parse(a.images):a.images});
export function publicMarket(app,{pool,fail}){
 app.get('/api/public/adverts',async(req,res)=>{
  const q=String(req.query.q||'').slice(0,100),category=String(req.query.category||'').slice(0,40);
  const page=Math.max(1,Math.min(10000,parseInt(String(req.query.page||'1'))||1)),limit=12;
  const where=`${visible} AND (?='' OR a.category=?) AND (?='' OR CONCAT(a.title,' ',a.title_en,' ',s.name,' ',s.name_en) LIKE ?)`;
  const args=[category,category,q,'%'+q+'%'];
  const [[{total}]]=await pool.execute(`SELECT COUNT(*) total ${publicJoin} WHERE ${where}`,args);
  const [rows]=await pool.execute(`SELECT a.id,a.title,a.title_en AS titleEn,a.category,ac.name AS categoryName,ac.name_en AS categoryNameEn,a.images,a.pinned,s.name AS shopName,s.name_en AS shopNameEn ${publicJoin} WHERE ${where} ORDER BY a.pinned DESC,a.updated_at DESC,a.id LIMIT ${limit} OFFSET ${(page-1)*limit}`,args);
  const [categories]=await pool.query(`SELECT id,name,name_en AS nameEn FROM advert_categories ORDER BY sort_order,id`);
  res.json({items:rows.map(normalize),total,page,pages:Math.ceil(total/limit),categories});
 });
 app.get('/api/public/adverts/:id',async(req,res)=>{
  const [[a]]=await pool.execute(`SELECT ${adFields},ac.name AS categoryName,ac.name_en AS categoryNameEn,s.name AS shopName,s.name_en AS shopNameEn,s.description AS shopDescription,s.description_en AS shopDescriptionEn,s.phone,s.wechat,s.address ${publicJoin} WHERE ${visible} AND a.id=?`,[req.params.id]);
  if(!a)fail(404,'广告不存在或已下架。');const {reviewNote,version,...item}=normalize(a);res.json(item);
 });
 app.get('/api/public/media/:id',async(req,res)=>{
  const [[m]]=await pool.execute(`SELECT m.bytes FROM media m WHERE m.id=? AND m.purpose='advert' AND EXISTS(SELECT 1 ${publicJoin} WHERE ${visible} AND JSON_CONTAINS(a.images,JSON_QUOTE(m.id)))`,[req.params.id]);
  if(!m)fail(404,'图片不存在。');res.type('jpeg').send(m.bytes);
 });
}
export function privateMarket(app,{pool,fail,text,transaction,versionCheck}){
 const market=(req,_res,next)=>{if(!['admin','shop'].includes(req.user.role))fail(403,'需要店铺或管理员权限。');next();};
 async function ownShop(c,id,user){const [[s]]=await c.execute('SELECT * FROM shops WHERE id=? FOR UPDATE',[id]);if(!s||(user.role!=='admin'&&(s.owner_id!==user.id||!s.enabled)))fail(404,'店铺不存在、已停用或无权操作。');return s;}
 async function imageAllowed(c,id,user,purpose){const [[m]]=await c.execute('SELECT id,owner_id,purpose FROM media WHERE id=?',[id]);if(!m||m.purpose!==purpose||(user.role!=='admin'&&m.owner_id!==user.id))fail(400,'图片无效或无权使用。');}
 app.post('/api/media',async(req,res)=>{
  const purpose=req.body?.purpose;
  if(!['avatar','advert'].includes(purpose)||(req.user.role==='shop'&&purpose!=='advert')||(req.user.role==='sales'&&purpose!=='avatar')||(req.user.role==='customer'&&purpose!=='avatar'))fail(403,'无权上传此类图片。');
  const value=req.body?.data;if(typeof value!=='string'||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value)||value.length>1500000)fail(400,'请选择不超过 1 MB 的 JPG、PNG 或 WebP 图片。');
  const [[{count}]]=await pool.execute('SELECT COUNT(*) count FROM media WHERE owner_id=? AND created_at>DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)',[req.user.id]);
  if(count>=200)fail(429,'今日图片上传次数已达上限。');
  let bytes;try{bytes=await sharp(Buffer.from(value.split(',')[1],'base64'),{limitInputPixels:20000000,animated:false}).rotate().resize({width:purpose==='avatar'?512:1600,height:purpose==='avatar'?512:1600,fit:'inside',withoutEnlargement:true}).jpeg({quality:82}).toBuffer();}catch{fail(400,'图片无法解码，请重新选择图片。');}
  if(bytes.length>1024*1024)fail(400,'图片过大，请缩小后重试。');
  const id=randomUUID();await pool.execute('INSERT INTO media(id,owner_id,purpose,bytes) VALUES(?,?,?,?)',[id,req.user.id,purpose,bytes]);res.status(201).json({id});
 });
 app.get('/api/media/:id',async(req,res)=>{
  const [[m]]=await pool.execute(`SELECT m.* FROM media m WHERE m.id=? AND (?='admin' OR (m.owner_id=? AND (m.purpose='advert' OR NOT EXISTS(SELECT 1 FROM customer_avatars attached WHERE attached.media_id=m.id))) OR EXISTS(SELECT 1 FROM customer_avatars v JOIN customer_accounts ca ON ca.customer_id=v.customer_id WHERE v.media_id=m.id AND ca.user_id=?) OR EXISTS(SELECT 1 FROM customer_avatars v JOIN customers c ON c.id=v.customer_id WHERE v.media_id=m.id AND c.owner_id=?) OR EXISTS(SELECT 1 FROM adverts a JOIN shops s ON s.id=a.shop_id WHERE s.owner_id=? AND JSON_CONTAINS(a.images,JSON_QUOTE(m.id))))`,[req.params.id,req.user.role,req.user.id,req.user.id,req.user.id,req.user.id]);
  if(!m)fail(404,'图片不存在或无权访问。');res.type('jpeg').send(m.bytes);
 });
 app.put('/api/customers/:id/avatar',async(req,res)=>{
  if(req.user.role==='shop')fail(403,'无权管理客户。');
  await transaction(async c=>{
   const [[row]]=await c.execute('SELECT * FROM customers WHERE id=? FOR UPDATE',[req.params.id]);
   const self=req.user.role==='customer'&&(await c.execute('SELECT customer_id FROM customer_accounts WHERE user_id=?',[req.user.id]))[0].some(x=>x.customer_id===row?.id);
   if(!row||(req.user.role!=='admin'&&row.owner_id!==req.user.id&&!self))fail(404,'客户不存在。');versionCheck(req.body,row);
   const id=req.body.mediaId;
   if(id){await imageAllowed(c,id,req.user,'avatar');await c.execute('INSERT INTO customer_avatars(customer_id,media_id) VALUES(?,?) ON DUPLICATE KEY UPDATE media_id=VALUES(media_id)',[row.id,id]);}
   else await c.execute('DELETE FROM customer_avatars WHERE customer_id=?',[row.id]);
   await c.execute('UPDATE customers SET version=version+1 WHERE id=?',[row.id]);
  });res.json({ok:true});
 });
 app.get('/api/market',market,async(req,res)=>{
  const scoped=req.user.role!=='admin',args=scoped?[req.user.id]:[];
  const [shops]=await pool.execute(`SELECT ${shopFields},u.name AS ownerName FROM shops s JOIN users u ON u.id=s.owner_id ${scoped?'WHERE s.owner_id=?':''} ORDER BY s.created_at DESC`,args);
  const [ads]=await pool.execute(`SELECT ${adFields},s.name AS shopName FROM adverts a JOIN shops s ON s.id=a.shop_id ${scoped?'WHERE s.owner_id=?':''} ORDER BY a.updated_at DESC`,args);
  res.json({shops,adverts:ads.map(normalize)});
 });
 for(const method of ['post','put'])app[method]('/api/shops'+(method==='put'?'/:id':''),market,async(req,res)=>{
  
  const values=[text(req.body,'name',80),text(req.body,'nameEn',120,false),text(req.body,'description',4000,false),text(req.body,'descriptionEn',4000,false),text(req.body,'phone',40,false),text(req.body,'wechat',80,false),text(req.body,'address',200,false)];
  const id=req.params.id||randomUUID();
  await transaction(async c=>{
   const row=method==='put'?await ownShop(c,id,req.user):null;if(row)versionCheck(req.body,row);
   const ownerId=req.user.role==='admin'?text(req.body,'ownerId',36):(row?.owner_id||req.user.id);
   if(method==='post'&&req.user.role==='shop'){await c.execute('SELECT id FROM users WHERE id=? FOR UPDATE',[req.user.id]);const [[{count}]]=await c.execute('SELECT COUNT(*) count FROM shops WHERE owner_id=?',[req.user.id]);if(count)fail(409,'你已开设店铺，请编辑现有店铺。');}
   const [[u]]=await c.execute('SELECT id,role FROM users WHERE id=? AND enabled=1',[ownerId]);
   const legacyOwner=method==='put'&&row?.owner_id===ownerId;
   if(!u||(u.role!=='shop'&&!legacyOwner))fail(400,'店铺负责人必须是已启用的店铺管理员账号。请先在账号管理中创建店铺账号。');
   const enabled=req.user.role==='admin'?req.body.enabled:(row?!!row.enabled:true);if(typeof enabled!=='boolean')fail(400,'店铺状态无效。');
   if(method==='post')await c.execute('INSERT INTO shops(id,owner_id,name,name_en,description,description_en,phone,wechat,address,enabled) VALUES(?,?,?,?,?,?,?,?,?,?)',[id,ownerId,...values,enabled]);
   else await c.execute('UPDATE shops SET owner_id=?,name=?,name_en=?,description=?,description_en=?,phone=?,wechat=?,address=?,enabled=?,version=version+1 WHERE id=?',[ownerId,...values,enabled,id]);
  });res.status(method==='post'?201:200).json({id});
 });
 app.delete('/api/shops/:id',market,async(req,res)=>{
  if(req.user.role!=='admin')fail(403,'需要管理员权限。');
  await transaction(async c=>{versionCheck(req.body,await ownShop(c,req.params.id,req.user));const [[{count}]]=await c.execute('SELECT COUNT(*) count FROM adverts WHERE shop_id=?',[req.params.id]);if(count)fail(409,'请先删除店铺下的广告，或改为停用店铺。');await c.execute('DELETE FROM shops WHERE id=?',[req.params.id]);});res.json({ok:true});
 });
 for(const method of ['post','put'])app[method]('/api/adverts'+(method==='put'?'/:id':''),market,async(req,res)=>{
  const shopId=text(req.body,'shopId',36),status=text(req.body,'status',20),images=req.body.images;
  const expires=req.body.expiresOn||null; if(expires&&(!/^\d{4}-\d{2}-\d{2}$/.test(expires)||!Number.isFinite(Date.parse(expires))||new Date(expires).toISOString().slice(0,10)!==expires))fail(400,'到期日期无效。');
  if(!['draft','pending','offline'].includes(status)||!Array.isArray(images)||images.length>6||images.some(x=>typeof x!=='string'||x.length!==36))fail(400,'广告状态或图片无效（最多 6 张）。');
  const values=[text(req.body,'title',120),text(req.body,'titleEn',160,status==='pending'),text(req.body,'body',12000),text(req.body,'bodyEn',12000,status==='pending'),text(req.body,'category',40)];
  if(status==='pending'&&!images.length)fail(400,'发布前请上传至少一张广告图片。');
  const id=req.params.id||randomUUID();
  await transaction(async c=>{
   const [[category]]=await c.execute('SELECT id FROM advert_categories WHERE id=? FOR UPDATE',[values[4]]);if(!category)fail(400,'分类已删除，请重新选择。');
   await ownShop(c,shopId,req.user);
   if(method==='put'){const [[row]]=await c.execute('SELECT * FROM adverts WHERE id=? FOR UPDATE',[id]);if(!row)fail(404,'广告不存在。');await ownShop(c,row.shop_id,req.user);versionCheck(req.body,row);}
   for(const image of images){
    const [[m]]=await c.execute('SELECT owner_id,purpose FROM media WHERE id=?',[image]);
    if(!m||m.purpose!=='advert')fail(400,'广告图片无效。');
    if(req.user.role!=='admin'&&m.owner_id!==req.user.id){const [[existing]]=await c.execute('SELECT id FROM adverts WHERE id=? AND JSON_CONTAINS(images,JSON_QUOTE(?))',[id,image]);if(!existing)fail(403,'无权使用其他店铺的图片。');}
   }
   if(expires&&status==='pending'&&expires<new Date(Date.now()+8*3600000).toISOString().slice(0,10))fail(400,'到期日期不能早于今天。');
   if(method==='post')await c.execute('INSERT INTO adverts(id,shop_id,title,title_en,body,body_en,category,images,status,expires_on) VALUES(?,?,?,?,?,?,?,?,?,?)',[id,shopId,...values,JSON.stringify(images),status,expires]);
   else await c.execute("UPDATE adverts SET shop_id=?,title=?,title_en=?,body=?,body_en=?,category=?,images=?,status=?,expires_on=?,review_note='',version=version+1 WHERE id=?",[shopId,...values,JSON.stringify(images),status,expires,id]);
  });res.status(method==='post'?201:200).json({id});
 });
 app.post('/api/adverts/:id/review',market,async(req,res)=>{
  if(req.user.role!=='admin')fail(403,'需要管理员审核。');
  const status=req.body.status;if(!['published','rejected','offline'].includes(status))fail(400,'审核状态无效。');
  const note=text(req.body,'reviewNote',500,false);if(status==='rejected'&&!note)fail(400,'请填写拒绝原因。');
  await transaction(async c=>{const [[a]]=await c.execute('SELECT * FROM adverts WHERE id=? FOR UPDATE',[req.params.id]);if(!a)fail(404,'广告不存在。');versionCheck(req.body,a);
   if(status==='published'){if(a.status!=='pending')fail(409,'仅待审核广告可以通过审核。');if(!a.title_en.trim()||!a.body_en.trim()||!normalize(a).images.length)fail(400,'广告双语内容或图片不完整。');if(a.expires_on&&a.expires_on<new Date(Date.now()+8*3600000).toISOString().slice(0,10))fail(400,'广告已过期。');}
   await c.execute('UPDATE adverts SET status=?,review_note=?,pinned=?,version=version+1 WHERE id=?',[status,note,req.body.pinned===true,a.id]);
  });res.json({ok:true});
 });
 app.patch('/api/adverts/:id/pin',market,async(req,res)=>{if(req.user.role!=='admin')fail(403,'需要管理员权限。');if(typeof req.body.pinned!=='boolean')fail(400,'置顶状态无效。');await transaction(async c=>{const [[a]]=await c.execute('SELECT * FROM adverts WHERE id=? FOR UPDATE',[req.params.id]);if(!a)fail(404,'广告不存在。');versionCheck(req.body,a);await c.execute('UPDATE adverts SET pinned=?,version=version+1 WHERE id=?',[req.body.pinned,a.id]);});res.json({ok:true});});
 app.delete('/api/adverts/:id',market,async(req,res)=>{
  await transaction(async c=>{const [[a]]=await c.execute('SELECT * FROM adverts WHERE id=? FOR UPDATE',[req.params.id]);if(!a)fail(404,'广告不存在。');await ownShop(c,a.shop_id,req.user);versionCheck(req.body,a);await c.execute('DELETE FROM adverts WHERE id=?',[a.id]);});res.json({ok:true});
 });
}
