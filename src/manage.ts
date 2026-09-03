import './manage.css';
type Customer = { id: string; name: string; company: string; phone: string; status: string };
type Sale = { id: string; customerId: string; item: string; cents: number; date: string };
type Data = { customers: Customer[]; sales: Sale[] };
const key = 'neon-loft-crm-v1';
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const money = (cents: number) => (cents / 100).toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' });
// getRandomValues also works when the demo is served over HTTP on a server IP.
function createRecordId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
let data: Data = { customers: [], sales: [] };
let storageReadable = true;
try {
  const raw = localStorage.getItem(key);
  if (raw) {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.customers) || !Array.isArray(parsed.sales)
      || !parsed.customers.every((c: Customer) => ['id','name','company','phone','status'].every(k => typeof (c as unknown as Record<string, unknown>)[k] === 'string'))
      || !parsed.sales.every((s: Sale) => ['id','customerId','item','date'].every(k => typeof (s as unknown as Record<string, unknown>)[k] === 'string') && Number.isSafeInteger(s.cents) && s.cents > 0)) throw new Error('invalid data');
    data = parsed;
  }
} catch { storageReadable = false; $('notice').textContent = '本机数据读取失败。为保护原数据，已暂停保存，请检查浏览器存储设置。'; }
let view: 'customers' | 'sales' = 'customers';
let editing: string | null = null;
const dialog = $<HTMLDialogElement>('editor');
const deleteDialog = $<HTMLDialogElement>('delete-dialog');
let pendingDelete: { id: string; view: 'customers' | 'sales' } | null = null;

function save(next: Data): boolean {
  if (!storageReadable) { $('form-error').textContent = '无法读取原数据，暂时不能保存。'; return false; }
  try { localStorage.setItem(key, JSON.stringify(next)); data = next; return true; }
  catch { $('notice').textContent = '保存失败：浏览器存储不可用或空间不足。'; $('form-error').textContent = '保存失败，请检查浏览器存储设置。'; return false; }
}

function render() {
  $('customer-count').textContent = String(data.customers.length);
  $('sale-count').textContent = String(data.sales.length);
  $('sale-total').textContent = money(data.sales.reduce((sum,s) => sum + s.cents, 0));
  $('section-title').textContent = view === 'customers' ? '客户管理' : '销售记录';
  $('add').textContent = view === 'customers' ? '新增客户' : '新增销售';
  $<HTMLInputElement>('search').placeholder = view === 'customers' ? '搜索姓名、公司、电话…' : '搜索客户、销售项目…';
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  const query = $<HTMLInputElement>('search').value.trim().toLowerCase();
  const cells = (values: string[]) => values.map(v => `<td>${escapeHtml(v)}</td>`).join('');
  const actions = (id: string) => `<td><button data-edit="${escapeHtml(id)}">编辑</button><button class="danger" data-delete="${escapeHtml(id)}">删除</button></td>`;
  let rows: string[];
  let headers: string[];
  if (view === 'customers') {
    headers = ['客户姓名','公司','联系电话','跟进状态','操作'];
    rows = data.customers.filter(c => `${c.name} ${c.company} ${c.phone}`.toLowerCase().includes(query))
      .map(c => `<tr>${cells([c.name,c.company || '—',c.phone || '—',c.status])}${actions(c.id)}</tr>`);
  } else {
    headers = ['客户','销售项目','金额','日期','操作'];
    rows = data.sales.map(s => ({ ...s, customer: data.customers.find(c => c.id === s.customerId)?.name || '未知客户' }))
      .filter(s => `${s.customer} ${s.item}`.toLowerCase().includes(query))
      .map(s => `<tr>${cells([s.customer,s.item,money(s.cents),s.date])}${actions(s.id)}</tr>`);
  }
  $('table-head').innerHTML = `<tr>${headers.map(h => `<th scope="col">${h}</th>`).join('')}</tr>`;
  $('table-body').innerHTML = rows.join('');
  $('empty').hidden = rows.length > 0;
  $('empty').textContent = query ? '没有找到匹配记录。' : view === 'customers' ? '从第一位客户开始。点击“新增客户”记录联系方式。' : '还没有销售记录。先添加客户，再记录第一笔销售。';
}

function openEditor(id: string | null = null) {
  if (view === 'sales' && data.customers.length === 0) { $('notice').textContent = '请先添加一位客户，再创建销售记录。'; return; }
  editing = id;
  $('form-error').textContent = '';
  $('dialog-title').textContent = `${id ? '编辑' : '新增'}${view === 'customers' ? '客户' : '销售'}`;
  const field = (name: string, label: string, value = '', extra = '') => `<label>${label}<input name="${name}" value="${escapeHtml(value)}" ${extra}></label>`;
  if (view === 'customers') {
    const c = data.customers.find(c => c.id === id);
    $('fields').innerHTML = field('name','客户姓名 *', c?.name, 'required maxlength="50"')
      + field('company','公司',c?.company,'maxlength="100"') + field('phone','联系电话',c?.phone,'type="tel" maxlength="30"')
      + `<label>跟进状态<select name="status">${['待联系','跟进中','已成交'].map(s => `<option${s === c?.status ? ' selected' : ''}>${s}</option>`).join('')}</select></label>`;
  } else {
    const s = data.sales.find(s => s.id === id);
    const today = new Date();
    const localDate = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    $('fields').innerHTML = `<label>客户 *<select name="customerId" required>${data.customers.map(c => `<option value="${escapeHtml(c.id)}"${c.id === s?.customerId ? ' selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}</select></label>`
      + field('item','销售项目 *',s?.item,'required maxlength="100"') + field('amount','金额（元）*',s ? (s.cents / 100).toFixed(2) : '', 'type="number" required min="0.01" max="999999999" step="0.01"')
      + field('date','销售日期 *',s?.date ?? localDate, 'type="date" required');
  }
  dialog.showModal();
}

document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b => b.addEventListener('click', () => {
  view = b.dataset.view as typeof view; $<HTMLInputElement>('search').value = ''; if (storageReadable) $('notice').textContent = ''; render();
}));
$('search').addEventListener('input', render);
$('add').addEventListener('click', () => openEditor());
for (const id of ['close','cancel']) $(id).addEventListener('click', () => dialog.close());
$('table-body').addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!button) return;
  if (button.dataset.edit) { openEditor(button.dataset.edit); return; }
  const id = button.dataset.delete;
  if (!id) return;
  if (view === 'customers' && data.sales.some(s => s.customerId === id)) { $('notice').textContent = '该客户已有销售记录。请先处理关联销售记录，再删除客户。'; return; }
  pendingDelete = { id, view };
  $('delete-prompt').textContent = `确定删除这${view === 'customers' ? '位客户' : '条销售记录'}？此操作无法撤销。`;
  deleteDialog.showModal();
});
$('delete-cancel').addEventListener('click', () => deleteDialog.close());
$('delete-confirm').addEventListener('click', () => {
  if (!pendingDelete) return;
  const { id, view: deleteView } = pendingDelete;
  const next = structuredClone(data);
  if (deleteView === 'customers') next.customers = next.customers.filter(c => c.id !== id);
  else next.sales = next.sales.filter(s => s.id !== id);
  if (save(next)) { $('notice').textContent = '记录已删除。'; pendingDelete = null; deleteDialog.close(); render(); }
});
$('record-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = new FormData(event.target as HTMLFormElement);
  const get = (name: string) => String(form.get(name) ?? '').trim();
  const next = structuredClone(data);
  const id = editing ?? createRecordId();
  if (view === 'customers') {
    if (!get('name')) { $('form-error').textContent = '请输入客户姓名。'; return; }
    const customer = { id, name: get('name'), company: get('company'), phone: get('phone'), status: get('status') };
    next.customers = editing ? next.customers.map(c => c.id === id ? customer : c) : [...next.customers,customer];
  } else {
    const cents = Math.round(Number(get('amount')) * 100);
    if (!get('item') || !Number.isSafeInteger(cents) || cents <= 0 || !get('date') || !next.customers.some(c => c.id === get('customerId'))) { $('form-error').textContent = '请检查客户、销售项目、金额和日期。'; return; }
    const sale = { id, customerId: get('customerId'), item: get('item'), cents, date: get('date') };
    next.sales = editing ? next.sales.map(s => s.id === id ? sale : s) : [...next.sales,sale];
  }
  if (save(next)) { dialog.close(); $('notice').textContent = '已保存到当前浏览器。'; render(); }
});
render();
