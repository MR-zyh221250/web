import {randomUUID} from 'node:crypto';

export async function migrateCommerce(pool) {
 const [existing]=await pool.query("SHOW TABLES LIKE 'advert_categories'");
 await pool.query(`CREATE TABLE IF NOT EXISTS advert_categories (
  id VARCHAR(40) PRIMARY KEY, name VARCHAR(60) NOT NULL, name_en VARCHAR(100) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0, version INT NOT NULL DEFAULT 1
 ) ENGINE=InnoDB`);
 if(!existing.length) {
  for(const [id,name,en,order] of [['food','餐饮美食','Food & drink',10],['shopping','购物零售','Shopping',20],['lifestyle','休闲体验','Experiences',30],['services','生活服务','Services',40]])
   await pool.execute('INSERT IGNORE INTO advert_categories(id,name,name_en,sort_order) VALUES(?,?,?,?)',[id,name,en,order]);
 }
 // Preserve categories already used by older adverts, including custom names.
 await pool.query('INSERT IGNORE INTO advert_categories(id,name,name_en) SELECT DISTINCT category,category,category FROM adverts');
 await pool.query(`CREATE TABLE IF NOT EXISTS sale_links (
  sale_id CHAR(36) PRIMARY KEY, shop_id CHAR(36) NULL, advert_id CHAR(36) NULL,
  reservation_id CHAR(36) NULL UNIQUE,
  FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY(shop_id) REFERENCES shops(id), FOREIGN KEY(advert_id) REFERENCES adverts(id),
  FOREIGN KEY(reservation_id) REFERENCES reservations(id)
 ) ENGINE=InnoDB`);
}

export function categories(app,{pool,fail,text,transaction,versionCheck}) {
 app.get('/api/categories',async(_req,res)=>{
  const [rows]=await pool.query('SELECT id,name,name_en AS nameEn,sort_order AS sortOrder,version FROM advert_categories ORDER BY sort_order,id');res.json(rows);
 });
 const admin=(req,_res,next)=>{if(req.user.role!=='admin')fail(403,'仅管理员可以维护分类。');next();};
 for(const method of ['post','put'])app[method]('/api/categories'+(method==='put'?'/:id':''),admin,async(req,res)=>{
  const name=text(req.body,'name',60),en=text(req.body,'nameEn',100),order=req.body.sortOrder;
  if(!Number.isInteger(order)||order<0||order>9999)fail(400,'排序值需为 0～9999 的整数，越小越靠前。');
  const id=req.params.id||randomUUID();
  await transaction(async c=>{
   if(method==='post')await c.execute('INSERT INTO advert_categories(id,name,name_en,sort_order) VALUES(?,?,?,?)',[id,name,en,order]);
   else{const [[r]]=await c.execute('SELECT * FROM advert_categories WHERE id=? FOR UPDATE',[id]);if(!r)fail(404,'分类不存在。');versionCheck(req.body,r);await c.execute('UPDATE advert_categories SET name=?,name_en=?,sort_order=?,version=version+1 WHERE id=?',[name,en,order,id]);}
  });res.status(method==='post'?201:200).json({id});
 });
 app.delete('/api/categories/:id',admin,async(req,res)=>{
  await transaction(async c=>{
   const [[r]]=await c.execute('SELECT * FROM advert_categories WHERE id=? FOR UPDATE',[req.params.id]);if(!r)fail(404,'分类不存在。');versionCheck(req.body,r);
   const [used]=await c.execute('SELECT id FROM adverts WHERE category=? LIMIT 1 FOR UPDATE',[r.id]);if(used.length)fail(409,'分类已被广告使用，请先调整广告分类。');
   await c.execute('DELETE FROM advert_categories WHERE id=?',[r.id]);
  });res.json({ok:true});
 });
}

export function saleOptions(app,{pool}) {
 app.get('/api/sale-options',async(_req,res)=>{
  const [shops]=await pool.query('SELECT s.id,s.name FROM shops s JOIN users u ON u.id=s.owner_id WHERE s.enabled=1 AND u.enabled=1 ORDER BY s.name');
  const [adverts]=await pool.query("SELECT a.id,a.shop_id AS shopId,a.title FROM adverts a JOIN shops s ON s.id=a.shop_id JOIN users u ON u.id=s.owner_id WHERE a.status='published' AND s.enabled=1 AND u.enabled=1 AND (a.expires_on IS NULL OR a.expires_on>=DATE(DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR))) ORDER BY a.title");
  res.json({shops,adverts});
 });
}

// Called inside the sales transaction, after checking customer ownership.
export async function linkSale(c,{body,user,customerId,oldSale,fail,versionCheck}) {
 const idField=key=>{const value=body[key];if(value==null||value==='')return null;if(typeof value!=='string'||value.length!==36)fail(400,'关联记录无效。');return value;};
 const [[previous]]=oldSale?await c.execute('SELECT * FROM sale_links WHERE sale_id=?',[oldSale.id]):[[]];
 const reservationId=previous?.reservation_id||idField('reservationId');
 if(previous?.reservation_id&&body.reservationId&&body.reservationId!==previous.reservation_id)fail(400,'不能更换销售的预约来源。');
 if(oldSale&&!previous?.reservation_id&&reservationId)fail(400,'请从预约列表新建关联销售。');
 if(reservationId){
  const [[r]]=await c.execute('SELECT r.*,ca.customer_id FROM reservations r JOIN customer_accounts ca ON ca.user_id=r.user_id WHERE r.id=? FOR UPDATE',[reservationId]);
  if(!r||r.customer_id!==customerId)fail(404,'预约不存在或与所选客人不匹配。');
  if(!oldSale){
   versionCheck({version:body.reservationVersion},r);
   if(!['confirmed','completed'].includes(r.status))fail(409,'请先由店铺确认预约，取消的预约不能转销售。');
   const [[duplicate]]=await c.execute('SELECT sale_id FROM sale_links WHERE reservation_id=?',[r.id]);if(duplicate)fail(409,'该预约已转为销售，请在销售记录中查看。');
  }
  if((body.shopId&&body.shopId!==r.shop_id)||(body.advertId&&body.advertId!==r.advert_id))fail(400,'预约销售的店铺和广告不能更换。');
  return {shopId:r.shop_id,advertId:r.advert_id,reservationId:r.id};
 }
 let shopId=idField('shopId'),advertId=idField('advertId');
 if(previous&&previous.shop_id===shopId&&previous.advert_id===advertId)return {shopId,advertId,reservationId:null};
 if(advertId){
  const [[ad]]=await c.execute("SELECT *, (expires_on IS NULL OR expires_on>=DATE(DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR))) AS valid FROM adverts WHERE id=? FOR UPDATE",[advertId]);
  if(!ad||ad.status!=='published'||!ad.valid)fail(400,'请选择已发布且未过期的广告。');
  if(shopId&&shopId!==ad.shop_id)fail(400,'广告不属于所选店铺。');shopId=ad.shop_id;
 }
 if(shopId){const [[shop]]=await c.execute('SELECT s.id FROM shops s JOIN users u ON u.id=s.owner_id WHERE s.id=? AND s.enabled=1 AND u.enabled=1 FOR UPDATE',[shopId]);if(!shop)fail(400,'请选择有效店铺。');}
 return {shopId,advertId,reservationId:null};
}
