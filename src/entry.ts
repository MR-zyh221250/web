import './entry.css';

const entrance = document.createElement('nav');
entrance.className = 'business-entry';
entrance.setAttribute('aria-label', '网站入口');
entrance.innerHTML = `<div class="entry-kicker">NEON LOFT / 霓虹会客厅</div>
  <div class="entry-title">夜色之中，连接生意。</div>
  <p>点击房间即可漫游。按 Esc 释放鼠标后，可进入客户管理。</p>
  <a class="entry-link" href="/manage.html">进入客户管理 <span aria-hidden="true">↗</span></a>`;
document.body.append(entrance);
document.addEventListener('pointerlockchange', () => {
  entrance.classList.toggle('roaming', Boolean(document.pointerLockElement));
});
