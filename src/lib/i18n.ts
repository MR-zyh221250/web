/**
 * Lightweight i18n module for NEON LOFT.
 * Language resolution order: ?lang=en|zh → localStorage → navigator.language → 'en'.
 * Call t(key) anywhere; call setLang('en'|'zh') to switch at runtime.
 */

export type Lang = 'zh' | 'en';

// ─── Dictionary ──────────────────────────────────────────────────────────────
const dict: Record<Lang, Record<string, string>> = {
  zh: {
    // ── index.html / boot ──
    'lock.desktop': '点击进入 / CLICK TO JACK IN',
    'lock.keys':
      '<span class="k">WASD</span> 移动 ·\n        <span class="k">鼠标</span> 视角 ·\n        <span class="k">Shift</span> 跑 ·\n        <span class="k">E</span> 互动 ·\n        <span class="k">ESC</span> 离开',
    'lock.touch': '点任意处进入 NEON LOFT',
    'lock.touch.keys':
      '<span class="k">左下摇杆</span> 移动 · <span class="k">滑动</span> 视角 · <span class="k">点一下</span> 互动',
    'touchhint': '滑动视角 · 点一下互动 · 左下摇杆移动',

    // ── GPU fail overlay ──
    'gpu.title': 'GPU DRIVER INCOMPATIBLE',
    'gpu.body': '此浏览器的 GPU 后端无法编译 shader（常见于 Chrome + 旧款 Intel 内显）。<br/>请改用 <b style="color:#5af2ff">Firefox</b> 开启本页，即可正常游玩。',

    // ── interact prompts ──
    'prompt.barLantern.on': '熄灭马赛克灯笼',
    'prompt.barLantern.off': '点亮马赛克灯笼',
    'flash.barLantern.on': '🪔 马赛克灯笼点亮 — 彩绘玻璃',
    'flash.barLantern.off': '🪔 灯笼熄灭',

    'prompt.deskLantern': '土耳其台灯 — 切换亮度',
    'prompt.deskLantern.off': '亮一级',
    'prompt.deskLantern.dim': '亮二级',
    'prompt.deskLantern.bright': '熄灭',
    'flash.deskLantern.off': '熄灭',
    'flash.deskLantern.dim': '微亮 (氛围)',
    'flash.deskLantern.bright': '明亮',
    // flash template: 💡 桌燈 → {level},再按一次:{next}
    'flash.deskLantern.prefix': '💡 桌灯 →',
    'flash.deskLantern.next': '再按一次:',

    'prompt.mosaic': '翻牌马赛克 — 换一幅',
    'flash.mosaic.prefix': '🖼 马赛克墙 →',

    'prompt.monitor': '接入 CyberOS',
    'prompt.tv': '空间投影',
    'prompt.tv.screen': '切换频道',
    'flash.tv.stop': '📽 投影结束',
    'flash.tv.cast': '📽 投影:',
    'flash.tv.resume': '▶ 续播',
    'flash.tv.pause': '⏸ 暂停',

    'prompt.neon': '切换霓虹色',
    'prompt.record': '播放黑胶 (合成器垫音)',
    'flash.record.on': '♫ 黑胶转动中…',
    'flash.record.off': '黑胶停止',

    'prompt.window': '切换雨势',
    'flash.rain.prefix': '🌧 雨势:',

    'prompt.bar': '调一杯酒',
    'flash.bar': '🍸 NEON COLA + 合成龙舌兰…干杯!',

    'prompt.sofa': '坐下 (电动沙发)',
    'flash.sofa.sit': '已就座 — 鼠标左右看 · [R] 椅背 · [M] 按摩 · 移动键起身',
    'flash.stand': '起身',
    'flash.recline.on': '⚙ 椅背放平 — 看看高楼上的雨',
    'flash.recline.off': '⚙ 椅背竖直',
    'flash.massage.on': '〰 按摩模式 8 秒',
    'flash.massage.off': '按摩停止',

    'prompt.bed': '小睡片刻',
    'flash.bed.drunk': '…睡了一会儿,酒醒了',
    'flash.bed.normal': '…睡了一会儿,窗外的雨还没停',

    'prompt.lights': '灯光情境',
    'flash.lights.prefix': '💡 灯光:',

    'prompt.pendants': '吧台柔光',
    'flash.pendants.on': '🪔 吧台柔光开启 — 配马赛克墙比较不刺眼',
    'flash.pendants.off': '🪔 吧台柔光熄灭 — 高对比模式',

    'prompt.holo': '全息投影',
    'flash.holo.prefix': '🔮 投影频道:',

    'prompt.curtain': '电动窗帘',
    'flash.curtain.closing': '🪟 窗帘下降中…',
    'flash.curtain.opening': '🪟 窗帘上升中…',

    'prompt.bookshelf': '藏书架',
    'flash.bookshelf': '📖 看准一本书的书脊按 E,把它取下来读',
    'prompt.book.prefix': '取下《',
    'prompt.book.suffix': '》',

    'prompt.shardArt': '读取碎片:重新策展 (全部换画)',
    'flash.shardArt': '🖼 已向大都会博物馆请求新一批馆藏…',
    'prompt.shardAudio': '读取碎片:家庭录音文件',
    'prompt.devlogShard': '??? 金色碎片',

    'prompt.frame': '换一幅画',
    'flash.frame': '🖼 重新策展中…',

    'prompt.bathDoor': '浴室门',
    'flash.bathDoor.open': '🚪 门开启',
    'flash.bathDoor.close': '🚪 门关闭',
    'prompt.toilet': '冲水',
    'flash.toilet': '🚽 哗——',
    'prompt.mirror': '智慧镜',
    'flash.mirror': '🪞 镜面扫描:外观评分 SSS — 今晚也很赛博朋克',
    'prompt.shower': '淋浴',
    'flash.shower.on': '🚿 热水 + 蒸气中…',
    'flash.shower.off': '🚿 关闭',
    'prompt.washer': '洗衣',
    'flash.washer': '🌀 洗衣行程 20 秒 — 滚筒运转中',

    'prompt.speaker': '音乐 播放/暂停',
    'flash.speaker.load': '🎧 还没加载电台 — 帮你开 NeuroSound',
    'flash.speaker.pause': '⏸ 音乐暂停',
    'flash.speaker.play': '▶ 音乐继续 — 配着窗外的雨刚刚好',

    'prompt.iris': '呼叫 虹 // IRIS',
    'flash.iris.prefix': '🟣 虹:「',
    'flash.iris.suffix': '」',

    'prompt.cat': '摸摸夜猫',
    'flash.cat': '🐈‍⬛ 夜猫:呼噜噜噜…(尾巴拍了拍)',
    'prompt.coffee': '冲一杯咖啡',
    'flash.coffee.brewing': '☕ 合成豆研磨中…(7 秒)',
    'flash.coffee.busy': '☕ 已经在煮了,稍安勿躁',

    'prompt.door': '大门',
    'flash.door.open': '🚪 安全锁解除 — 门开',
    'flash.door.close': '🚪 门关闭,上锁',
    'prompt.package': '捡起包裹',

    'prompt.wardrobe': '换装',
    'flash.wardrobe.prefix': '🧥 义体外装 →',
    'flash.wardrobe.suffix': '(去浴室照照镜子)',

    'prompt.projector': '床头星空仪',
    'flash.projector.prefix': '✨ 星空仪 →',

    'prompt.pickup.prefix': '拿起 ',
    'flash.pickup.held': '✋ 拿着「',
    'flash.pickup.held.suffix': '」— [F] 放下 · [Q] 放回原位',
    'flash.pickup.drop': '📍 「',
    'flash.pickup.drop.suffix': '」放在这',
    'flash.pickup.return': '↩ 「',
    'flash.pickup.return.suffix': '」放回原位',

    'prompt.fridge': '打开冰箱',
    'flash.fridge.open': '🧊 NEON COLA × 5 + 神秘紫色瓶子 + 邻居的塑胶花',
    'flash.fridge.close': '🚪 冰箱关起来',

    'prompt.dnd': '勿扰模式 (DND) 切换',
    'flash.dnd.on': '🔇 勿扰模式 — 门铃会被静音,包裹仍在门口累积',
    'flash.dnd.off': '🔔 接受访客 — 累积的包裹会在下次门铃释出',

    'flash.doorbell': '🔔 门铃 — 有人放了东西在门口',
    'flash.doorbell.missed': '🔔 门铃 — 趁你不在的时候有东西到了',

    'prompt.arcade.screen': '投币开玩 NEON BREAKER',
    'prompt.arcade.shell': '投币开玩 NEON BREAKER',
    'flash.arcade.leave': '离开街机 — 下次再来破纪录',

    'flash.cyberos.vr': '⏏ CyberOS 在 VR 暂不可用 (DOM 介面)',

    // ── floor plan ──
    'plan.title': 'FLOOR PLAN ▸ NEON LOFT',
    'plan.info.prefix': '房间 ',
    'plan.info.mid': 'm × ',
    'plan.info.suffix': 'm  ·  显示物件 ',
    'plan.info.end': ' 件  ·  P 或 term plan 切回 3D',
    'plan.legend.wall': '墙/结构',
    'plan.legend.furniture': '家具',
    'plan.legend.interactive': '可互动',
    'plan.legend.pickable': '可拿取',
    'plan.legend.prop': '杂物',

    // ── bookreader ──
    'book.loading': '撷取书页中…',
    'book.error': '⛔ 图书馆连线失败',
    'book.footer.read': '— 全书完 —',
    'book.footer.nav': '%  ·  [A/D] 翻页  [E] 阖上',

    // ── audit report strings (produced by formatAuditReport in main.ts) ──
    'audit.pass': '> 物件配置稽核 ✓ 全部通过 (没有埋墙 / 浮空 / 重大重叠)',
    'audit.head.prefix': '> 物件配置稽核 — 共发现 ',
    'audit.head.suffix': ' 项异常:',
    'audit.more.prefix': '  …还有 ',
    'audit.more.suffix': ' 项。完整清单在浏览器 console: window.neon.audit()',

    // ── cast pipeline ──
    'flash.cast.wall.fail': '⛔ 马赛克墙尚未加载',
    'flash.cast.wall': '📡 投影到马赛克墙 — 28×5 LED 面板',
    'flash.cast.wall.done': '📡 已投影到马赛克墙 — 回厨房看',
    'flash.cast.tv': '📽 投影展开 — 回客厅看吧,影片浮在半空',
    'flash.cast.tv.done': '📽 已投影到客厅 — ESC 出去边走边看',
    'flash.cast.fail.prefix': '⛔ 投影失败:',

    // ── thunder ──
    'flash.thunder': '⚡ 闪电 + 滚雷,雨声短暂减弱',

    // ── IRIS lines ──
    'iris.0': '夜城的雨,下得比你的截止日还准时。',
    'iris.1.a': '外面的真实世界:',
    'iris.1.b': '。窗外这场雨倒是我们自己选的。',
    'iris.1.no': '定位资料还没回来,不过依我看,哪里都在下雨。',
    'iris.2': '你的咖啡因摄取量已超标。要我假装没看到,还是再煮一杯?',
    'iris.3': '夜猫今天换了三个睡觉位置。牠的日程比你充实。',
    'iris.4': '提醒:你已经盯着城市看了一阵子了。这不是坏事,我只是记录一下。',
    'iris.5': '雨太大了吗?我把它调小一点。…好了。',
    'iris.time.prefix': '现在时间 ',
    'iris.time.h': ' 点 ',
    'iris.time.m': ' 分。',

    // ── lighting moods ──
    'mood.standard': '标准',
    'mood.reading': '阅读',
    'mood.cinema': '影院',
    'mood.party': '派对',
    'mood.dark': '全暗',

    // ── WMO weather descriptions ──
    'wmo.clear': '晴',
    'wmo.partly': '多云时晴',
    'wmo.overcast': '阴',
    'wmo.fog': '雾',
    'wmo.drizzle': '毛毛雨',
    'wmo.rain': '雨',
    'wmo.snow': '雪',
    'wmo.showers': '阵雨',
    'wmo.thunderstorm': '雷雨',

    // ── CyberOS Terminal ──
    'term.boot': 'CyberOS NeoTerm — 输入 help 查看指令',
    'term.help.env': '── 环境 / 氛围 ──',
    'term.help.lights': '── 灯具 ──',
    'term.help.visual': '── 视觉装置 ──',
    'term.help.atmo': '── 大气 / 电影感 ──',
    'term.help.av': '── 影音投影 ──',
    'term.help.gallery': '── 艺廊 / 图书 ──',
    'term.help.sys': '── 系统 / 彩蛋 ──',
    'term.help.weather': 'weather <off|light|heavy>   控制窗外雨势',
    'term.help.curtain': 'curtain                     电动窗帘升/降',
    'term.help.neon': 'neon                        切换窗边霓虹灯色',
    'term.help.light': 'light                       灯光情境 (标准/阅读/影院/派对/全暗)',
    'term.help.dnd': 'dnd / quiet                 勿扰模式 — 门铃静音(包裹仍累积)',
    'term.help.lantern': 'lantern                     吧台马赛克灯笼 开/关',
    'term.help.desklamp': 'desklamp                    桌上土耳其台灯 三段:熄/微亮/明亮',
    'term.help.wash': 'wash / pendant              吧台柔光吊灯 开/关',
    'term.help.mosaic': 'mosaic                      翻牌马赛克墙 换一幅 (14 幅艺术品轮播)',
    'term.help.holo': 'holo                        茶几全息小投影 切换 (球/迷你城/宝石)',
    'term.help.ad': 'ad                          天际线插播一支全息广告',
    'term.help.iris': 'iris                        虹 (IRIS) 全息助理说一句',
    'term.help.flicker': 'flicker [off]               城市霓虹呼吸 + 随机停电 (预设开)',
    'term.help.brownout': 'brownout                    立即手动触发一次区域停电',
    'term.help.thunder': 'thunder                     雷光闪 + 滚雷音 + 雨声短暂变小',
    'term.help.cinema': 'cinema / vista [off]        电影模式:景深 + 黑边 + 镜头微飘',
    'term.help.tv': 'tv [off]                    马赛克墙当电视/退出 (3 个本地频道)',
    'term.help.cast': 'cast [wall|tv] [<YT_ID>]    串流投影 — 预设客厅全息电视,wall=马赛克墙',
    'term.help.holotint': 'holotint / tint             全息电视色调循环 (无色/淡蓝/中蓝/深蓝/全蓝)',
    'term.help.bgm': 'bgm <play|next>             NeuroSound 音乐控制',
    'term.help.art': 'art / gallery               墙上名画提示 (走到画框前按 E 换画)',
    'term.help.lib': 'lib / books                 书架提示',
    'term.help.plan': 'plan / map                  俯视 2D 平面图 (P 键也可切换)',
    'term.help.audit': 'audit / check               物件配置稽核 (埋墙 / 浮空 / 重叠)',
    'term.help.stats': 'stats                       显示 FPS / 渲染器 / 座标',
    'term.help.devlog': 'devlog                      开启 DEV.LOG 建造日志',
    'term.help.viola': 'viola                       开启 VIOLA.ARCHIVE 家庭录音',
    'term.help.whoami': 'whoami / ls / cat <档名>    终端机假装有文件',
    'term.help.clear': 'clear                       清萤幕',
    'term.weather.set.prefix': '> 天候控制:雨势 ',
    'term.weather.get.prefix': '目前雨势: ',
    'term.weather.get.suffix': ' (用法: weather off|light|heavy)',
    'term.neon.prefix': '> 霓虹色 → ',
    'term.curtain.close': '> 窗帘:下降中…',
    'term.curtain.open': '> 窗帘:上升中…',
    'term.holo.prefix': '> 全息投影 → ',
    'term.lantern.on': '> 马赛克灯笼 → 点亮 (彩绘玻璃)',
    'term.lantern.off': '> 马赛克灯笼 → 熄灭',
    'term.desklamp.prefix': '> 桌上土耳其灯 → ',
    'term.mosaic.prefix': '> 翻牌马赛克墙 → ',
    'term.holotint.prefix': '> 全息投影色调 → ',
    'term.tv.prefix': '> 马赛克电视 → ',
    'term.pendant.on': '> 吧台柔光开启',
    'term.pendant.off': '> 吧台柔光熄灭',
    'term.dnd.on': '> 勿扰模式 — 门铃静音中',
    'term.dnd.off': '> 接受访客',
    'term.projector.prefix': '> 床头星空仪 → ',
    'term.plan.on': '> 2D 平面图开启 — 走动时三角形跟着动,再 plan 或按 P 关闭',
    'term.plan.off': '> 回到 3D 视角',
    'term.fridge.open': '> 冰箱打开了',
    'term.fridge.close': '> 冰箱关闭',
    'term.lights.prefix': '> 灯光情境 → ',
    'term.books': '> 藏书已实体化 — 到书柜前看准书脊按 E,把书取下来读',
    'term.cast.noid': '> 先在 NeuroSound 选一首,或直接 cast wall <YT_ID>',
    'term.cast.wall': '> 解析串流并投影到马赛克墙…',
    'term.cast.tv': '> 解析串流并投影到客厅…',
    'term.ad.prefix': '> 全息广告插播 → ',
    'term.flicker.off': '> 霓虹闪烁 → 关闭,城市静如标本',
    'term.flicker.on': '> 霓虹闪烁 → 开启,三色慢呼吸 + 随机停电',
    'term.brownout.prefix': '> ',
    'term.brownout.suffix': ' (约 1 秒)',
    'term.thunder.prefix': '> ',
    'term.cinema.on': '> 电影模式 → 开启 — 景深 + 黑边,自动微移镜头',
    'term.cinema.off': '> 电影模式 → 关闭',
    'term.art': '> 名画已上墙 — 看着任何一幅画框按 E 可换画',
    'term.iris.prefix': '> 虹:「',
    'term.iris.suffix': '」',
    'term.devlog': '> 解密造屋者日志…',
    'term.viola': '> 开启私人录音文件库',
    'term.whoami': 'V (aka 房间的主人)',
    'term.ls': 'manifesto.txt  netrun.cfg  jazz.playlist  no_future/',
    'term.cat.manifesto': '我们在霓虹里入睡,在雨声中醒来。\n城市不会记得任何人,但今晚的合成器音色属于我。',
    'term.cat.notfound.prefix': 'cat: ',
    'term.cat.notfound.suffix': ': 没有那个文件',
    'term.hack.suffix': '\n> ACCESS GRANTED ✔ (其实什么都没发生)',
    'term.notfound.prefix': "term: 找不到指令 '",
    'term.notfound.suffix': "' — 试试 help",

    // ── CyberOS NeuroSound ──
    'ns.cast': '📽 投影到客厅',
    'ns.search.placeholder': '搜寻 YouTube 音乐… (歌名 / 歌手 / 电台)',
    'ns.search.btn': '🔍 搜寻',
    'ns.hint': '搜寻任何歌曲,点缩图即播。也可直接贴 YouTube 连结。<br/>音量会随你离喇叭的距离变化 — 站到窗边听听看。',
    'ns.searching': '⟳ 正在扫描网路节点…(首次搜寻约 5 秒)',
    'ns.noresult': '没有结果',
    'ns.search.fail.prefix': '⛔ 搜寻失败:',
    'ns.cast.nosel': '先选一首歌再投影',
    'ns.cast.loading': '⟳ 解析串流中…',

    // ── Netrunner ──
    'browser.placeholder': 'https:// — 部分网站会拒绝嵌入 (X-Frame-Options)',
    'browser.ice': '目标主机拒绝神经连结 (X-Frame-Options)<br/>请换一个节点,或用实体浏览器开启',
    'browser.bm.taipei': '台北地图',
    'browser.bm.wiby': 'Wiby 复古搜寻',

    // ── SysMon ──
    'sysmon.quality.hint': '切换画质档位会重新加载场景',

    // ── Gallery ──
    'gallery.loading': '读取资料碎片…',
    'gallery.searching': '检索馆藏中…',
    'gallery.fail.prefix': '⛔ 馆藏连线失败:',
    'gallery.decode.fail': '这个碎片解码失败,换一个藏家试试',
    'gallery.untitled': '无题',
    'gallery.anon': '佚名',
    'gallery.next': '▶ 下一件藏品',
    'gallery.src': '资料源:大都会博物馆 Open Access(公有领域)',
    'gallery.lib.loading': '⟳ 解码资料碎片…',
    'gallery.lib.more.prefix': '已加载 ',
    'gallery.lib.more.suffix': '% <button class="more">▼ 继续读取</button>',
    'gallery.lib.done.prefix': '■ 全书完 (',
    'gallery.lib.done.suffix': 'k 字元)',
    'gallery.lib.fail.prefix': '⛔ 图书馆连线失败:',
    'gallery.shelf.select': '选择一本书 — 全文连线自 Project Gutenberg 公共图书馆',
    'gallery.shelf.intro': '纸本在这个年代是奢侈品。<br/>但公共图书馆的资料库永远免费。',

    // ── Viola ──
    'viola.header': '♪ 家庭文件 — 中提琴练习录音(仅本机,不上云)',
    'viola.empty.prefix': '资料夹还是空的。<br/>把录音档放进 <b style="color:#5af2ff">',
    'viola.empty.suffix': '</b><br/>重新开启本视窗即自动上架。',
    'viola.fail': '读取失败',

    // ── NeoMail ──
    'mail.select': '选一封信件…',
    'mail.from': '寄件者: ',
    'mail.subj': '主旨: ',

    // ── TV channels / holo tints ──
    'tv.ch.crt': 'CRT 轨道追踪',
    'tv.ch.noise': '杂讯',
    'tv.ch.ad': '广告',
    'tv.ch.spectrum': '城市频谱',
    'tv.casting': '点播中',
    'tint.none': '无色',
    'tint.light': '淡蓝',
    'tint.mid': '中蓝',
    'tint.deep': '深蓝',
    'tint.full': '全蓝',

    // ── city brownout ──
    'city.mat.cyan': '青蓝',
    'city.mat.pink': '霓桃',
    'city.mat.amber': '琥珀',
    'city.brownout.already': ' 区域已熄灯',
    'city.brownout.trigger': ' 区域熄灯',

    // ── star projector ──
    'proj.off': '熄灭',
    'proj.cyber': '赛博全息',
    'proj.cozy': '营火暖光',
    'proj.planet': '古典星象',

    // ── pickable object names ──
    'pick.mug': '咖啡杯',
    'pick.noodle': '泡面杯',
    'pick.shard': '紫色资料碎片',

    // ── system/RPC fallbacks ──
    'rpc.not.loaded': '(未加载)',
    'rpc.tv.exit.ok': '电视模式关闭,回到艺廊轮播',
    'rpc.tv.exit.noop': '不在电视模式',
    'mosaic.flipping': '(切换中…)',
    'mosaic.no.video': '(无影片)',

    // ── package loot ──
    'package.0': '📦 NEON COLA 兑换箱 — 里面是 24 罐酸雨柠檬口味',
    'package.1': '📦 邻居误送的义体目录 — 折页停在「夜视瞳 v2」那页',
    'package.2': '📦 一束塑胶花,附卡片:「替我浇水 — K」',
    'package.3': '📦 二手书《如何与你的智慧家居和平共处》',
    'package.4': '📦 空箱子。只有一张字条:「他们在看。」',

    // ── weather text ──
    'weather.text': '{city} {temp} 度,{desc}',

    // ── NeoMail messages ──
    'mail.msg.0.from': '房东 K',
    'mail.msg.0.subj': '租金调涨通知',
    'mail.msg.0.body': '住户你好:\n\n因第七区治安费上调,下季租金调整为 ¥4,200/月。\n附注:上次你阳台的无人机残骸已清除,费用 ¥350 将并入帐单。\n\n— K',
    'mail.msg.1.from': 'NCPD 自动系统',
    'mail.msg.1.subj': '噪音检举结案',
    'mail.msg.1.body': '你于 03:12 检举的「楼上机械脚步声」已结案。\n结案原因:该楼层登记住户为战斗改造退役者,属合法义体维护行为。\n\n祝你有美好的一天。',
    'mail.msg.2.from': 'Drv.Chen',
    'mail.msg.2.subj': 'Re: 义眼韧体',
    'mail.msg.2.body': '老样子,韧体我帮你压到 v0.9.7,夜视模组的色偏修了。\n但你那颗瞳孔的供应商倒了,下次坏掉就真的要换整颗。\n保重。\n\n— 陈',
    'mail.msg.3.from': 'NEON COLA',
    'mail.msg.3.subj': '★ 本周优惠 ★',
    'mail.msg.3.body': '买二送一!全新口味「酸雨柠檬」上市!\n凭此信至任一贩卖机输入代码 NEON-X 兑换。\n\n(本优惠不适用于现实世界)',

    // ── lang toggle ──
    'lang.toggle': 'EN',

    // ── credits panel ──
    'credits.btn': '授权',
    'credits.title': '素材授权与致谢',
    'credits.close': '关闭 (ESC)',
    'credits.intro': '本作品内含以下第三方素材,依各自授权条款使用并致谢。',
    'credits.sec.wikimedia': 'Wikimedia Commons 照片 (CC-BY-SA)',
    'credits.sec.wikimedia.note': '以下照片经裁切与夜色调整后贴图使用,原始文件与摄影师致谢见各 Commons 文件页。公开部署须保持 CC-BY-SA 相容。',
    'credits.sec.video': 'Wikimedia Commons 影片 (CC-BY / 公有领域)',
    'credits.sec.cc0': 'Polyhaven 与 ambientCG 模型/材质 (CC0)',
    'credits.sec.cc0.note': 'CC0 无需署名,仍列出以志来源。',
    'credits.sec.met': '大都会博物馆 Open Access 艺术品 (CC0)',
    'credits.sec.met.note': '档名 (met-*) 为内部代号,非作品作者;下方为实际作品名与作者。',
    'credits.met.filename': '档名',
    'credits.met.work': '作品与作者',
    'credits.full': '完整清单(含撷取日期、来源脚本)见程式库的 THIRD_PARTY_ASSETS.md。',
  },

  en: {
    // ── index.html / boot ──
    'lock.desktop': 'Click to enter / CLICK TO JACK IN',
    'lock.keys':
      '<span class="k">WASD</span> Move ·\n        <span class="k">Mouse</span> Look ·\n        <span class="k">Shift</span> Sprint ·\n        <span class="k">E</span> Interact ·\n        <span class="k">ESC</span> Exit',
    'lock.touch': 'Tap anywhere to enter NEON LOFT',
    'lock.touch.keys':
      '<span class="k">Left joystick</span> Move · <span class="k">Swipe</span> Look · <span class="k">Tap</span> Interact',
    'touchhint': 'Swipe to look · Tap to interact · Left joystick to move',

    // ── GPU fail overlay ──
    'gpu.title': 'GPU DRIVER INCOMPATIBLE',
    'gpu.body': 'This browser\'s GPU backend cannot compile shaders (common on Chrome + older Intel iGPU).<br/>Open the page in <b style="color:#5af2ff">Firefox</b> for a smooth experience.',

    // ── interact prompts ──
    'prompt.barLantern.on': 'Put out the lantern',
    'prompt.barLantern.off': 'Light the mosaic lantern',
    'flash.barLantern.on': '🪔 Mosaic lantern lit — stained glass glow',
    'flash.barLantern.off': '🪔 Lantern extinguished',

    'prompt.deskLantern': 'Turkish desk lamp — adjust brightness',
    'prompt.deskLantern.off': 'Brighter',
    'prompt.deskLantern.dim': 'Full brightness',
    'prompt.deskLantern.bright': 'Turn off',
    'flash.deskLantern.off': 'Off',
    'flash.deskLantern.dim': 'Dim (ambient)',
    'flash.deskLantern.bright': 'Bright',
    'flash.deskLantern.prefix': '💡 Desk lamp →',
    'flash.deskLantern.next': 'press again:',

    'prompt.mosaic': 'Flip mosaic — next artwork',
    'flash.mosaic.prefix': '🖼 Mosaic wall →',

    'prompt.monitor': 'Jack into CyberOS',
    'prompt.tv': 'Holographic projection',
    'prompt.tv.screen': 'Change channel',
    'flash.tv.stop': '📽 Projection ended',
    'flash.tv.cast': '📽 Casting: ',
    'flash.tv.resume': '▶ Resume',
    'flash.tv.pause': '⏸ Paused',

    'prompt.neon': 'Cycle neon colour',
    'prompt.record': 'Play vinyl (synth pad)',
    'flash.record.on': '♫ Vinyl spinning…',
    'flash.record.off': 'Vinyl stopped',

    'prompt.window': 'Change rain intensity',
    'flash.rain.prefix': '🌧 Rain: ',

    'prompt.bar': 'Mix a drink',
    'flash.bar': '🍸 NEON COLA + synthetic tequila… cheers!',

    'prompt.sofa': 'Sit down (electric sofa)',
    'flash.sofa.sit': 'Seated — mouse to look · [R] recline · [M] massage · move to stand',
    'flash.stand': 'Standing up',
    'flash.recline.on': '⚙ Reclined — watch the rain above the towers',
    'flash.recline.off': '⚙ Upright',
    'flash.massage.on': '〰 Massage mode — 8 seconds',
    'flash.massage.off': 'Massage off',

    'prompt.bed': 'Take a nap',
    'flash.bed.drunk': '…slept it off',
    'flash.bed.normal': '…napped a while. The rain is still falling.',

    'prompt.lights': 'Lighting mood',
    'flash.lights.prefix': '💡 Lighting: ',

    'prompt.pendants': 'Bar pendant lights',
    'flash.pendants.on': '🪔 Bar lights on — softer against the mosaic wall',
    'flash.pendants.off': '🪔 Bar lights off — high contrast mode',

    'prompt.holo': 'Holographic projector',
    'flash.holo.prefix': '🔮 Holo channel: ',

    'prompt.curtain': 'Electric curtain',
    'flash.curtain.closing': '🪟 Curtain closing…',
    'flash.curtain.opening': '🪟 Curtain opening…',

    'prompt.bookshelf': 'Bookshelf',
    'flash.bookshelf': '📖 Aim at a spine and press E to take it down',
    'prompt.book.prefix': 'Read ',
    'prompt.book.suffix': '',

    'prompt.shardArt': 'Read shard: re-curate all wall art',
    'flash.shardArt': '🖼 Requesting new works from The Met…',
    'prompt.shardAudio': 'Read shard: family recordings',
    'prompt.devlogShard': '??? Golden shard',

    'prompt.frame': 'Swap painting',
    'flash.frame': '🖼 Re-curating…',

    'prompt.bathDoor': 'Bathroom door',
    'flash.bathDoor.open': '🚪 Door open',
    'flash.bathDoor.close': '🚪 Door closed',
    'prompt.toilet': 'Flush',
    'flash.toilet': '🚽 Whoosh—',
    'prompt.mirror': 'Smart mirror',
    'flash.mirror': '🪞 Facial scan: rating SSS — very cyberpunk tonight',
    'prompt.shower': 'Shower',
    'flash.shower.on': '🚿 Hot water + steam…',
    'flash.shower.off': '🚿 Off',
    'prompt.washer': 'Laundry',
    'flash.washer': '🌀 20-second wash cycle — drum spinning',

    'prompt.speaker': 'Music play/pause',
    'flash.speaker.load': '🎧 No station loaded — opening NeuroSound',
    'flash.speaker.pause': '⏸ Music paused',
    'flash.speaker.play': '▶ Music playing — pairs perfectly with the rain',

    'prompt.iris': 'Call 虹 // IRIS',
    'flash.iris.prefix': '🟣 IRIS: "',
    'flash.iris.suffix': '"',

    'prompt.cat': 'Pet the cat',
    'flash.cat': '🐈‍⬛ Nightcat: purrrr… (tail swish)',
    'prompt.coffee': 'Brew coffee',
    'flash.coffee.brewing': '☕ Grinding synthetic beans… (7 s)',
    'flash.coffee.busy': '☕ Already brewing — hold on',

    'prompt.door': 'Front door',
    'flash.door.open': '🚪 Lock released — door open',
    'flash.door.close': '🚪 Door closed, locked',
    'prompt.package': 'Pick up package',

    'prompt.wardrobe': 'Change outfit',
    'flash.wardrobe.prefix': '🧥 Cyberware skin →',
    'flash.wardrobe.suffix': '(check yourself in the mirror)',

    'prompt.projector': 'Bedside star projector',
    'flash.projector.prefix': '✨ Star projector →',

    'prompt.pickup.prefix': 'Pick up ',
    'flash.pickup.held': '✋ Holding "',
    'flash.pickup.held.suffix': '" — [F] Drop · [Q] Return',
    'flash.pickup.drop': '📍 "',
    'flash.pickup.drop.suffix': '" dropped here',
    'flash.pickup.return': '↩ "',
    'flash.pickup.return.suffix': '" returned',

    'prompt.fridge': 'Open fridge',
    'flash.fridge.open': "🧊 NEON COLA × 5 + mystery purple bottle + neighbour's plastic flower",
    'flash.fridge.close': '🚪 Fridge closed',

    'prompt.dnd': 'Do-Not-Disturb toggle',
    'flash.dnd.on': '🔇 DND on — doorbell silenced, packages still pile up',
    'flash.dnd.off': '🔔 Accepting visitors — queued packages released on next ring',

    'flash.doorbell': '🔔 Doorbell — someone left something at the door',
    'flash.doorbell.missed': '🔔 Doorbell — a delivery arrived while you were away',

    'prompt.arcade.screen': 'Insert coin — NEON BREAKER',
    'prompt.arcade.shell': 'Insert coin — NEON BREAKER',
    'flash.arcade.leave': 'Left the arcade — come back for the high score',

    'flash.cyberos.vr': '⏏ CyberOS unavailable in VR (DOM overlay)',

    // ── floor plan ──
    'plan.title': 'FLOOR PLAN ▸ NEON LOFT',
    'plan.info.prefix': 'Room ',
    'plan.info.mid': 'm × ',
    'plan.info.suffix': 'm  ·  ',
    'plan.info.end': ' objects  ·  P or "plan" to exit',
    'plan.legend.wall': 'Wall/structure',
    'plan.legend.furniture': 'Furniture',
    'plan.legend.interactive': 'Interactive',
    'plan.legend.pickable': 'Pickable',
    'plan.legend.prop': 'Prop',

    // ── bookreader ──
    'book.loading': 'Fetching pages…',
    'book.error': '⛔ Library connection failed',
    'book.footer.read': '— End of book —',
    'book.footer.nav': '%  ·  [A/D] Turn page  [E] Close',

    // ── audit report ──
    'audit.pass': '> Placement audit ✓ All clear (no embedded walls / floating / major overlap)',
    'audit.head.prefix': '> Placement audit — found ',
    'audit.head.suffix': ' issue(s):',
    'audit.more.prefix': '  …and ',
    'audit.more.suffix': ' more. Full list in browser console: window.neon.audit()',

    // ── cast pipeline ──
    'flash.cast.wall.fail': '⛔ Mosaic wall not loaded yet',
    'flash.cast.wall': '📡 Casting to mosaic wall — 28×5 LED panel',
    'flash.cast.wall.done': '📡 Cast to mosaic wall — head to the kitchen to watch',
    'flash.cast.tv': '📽 Projection up — go back to the living room, the film floats mid-air',
    'flash.cast.tv.done': '📽 Cast to living room — press ESC to walk around while watching',
    'flash.cast.fail.prefix': '⛔ Cast failed: ',

    // ── thunder ──
    'flash.thunder': '⚡ Lightning + thunder — rain briefly quiets',

    // ── IRIS lines ──
    'iris.0': 'The rain in Night City is more punctual than your deadlines.',
    'iris.1.a': 'Outside in the real world: ',
    'iris.1.b': '. The rain out that window, though — that one\'s ours.',
    'iris.1.no': 'Location data hasn\'t come back yet. Feels like it\'s raining everywhere.',
    'iris.2': 'Your caffeine intake is above threshold. Should I look the other way, or brew another?',
    'iris.3': 'Nightcat changed sleeping spots three times today. Busier schedule than yours.',
    'iris.4': 'Note: you\'ve been staring at the city for a while. That\'s not a bad thing — just logging it.',
    'iris.5': 'Too much rain? Let me dial it down a notch. …Done.',
    'iris.time.prefix': 'Current time: ',
    'iris.time.h': ':',
    'iris.time.m': '. ',

    // ── lighting moods ──
    'mood.standard': '標準',
    'mood.reading': '閱讀',
    'mood.cinema': '影院',
    'mood.party': '派對',
    'mood.dark': '全暗',

    // ── WMO weather descriptions ──
    'wmo.clear': 'Clear',
    'wmo.partly': 'Partly cloudy',
    'wmo.overcast': 'Overcast',
    'wmo.fog': 'Fog',
    'wmo.drizzle': 'Drizzle',
    'wmo.rain': 'Rain',
    'wmo.snow': 'Snow',
    'wmo.showers': 'Showers',
    'wmo.thunderstorm': 'Thunderstorm',

    // ── CyberOS Terminal ──
    'term.boot': 'CyberOS NeoTerm — type help for commands',
    'term.help.env': '── Environment / Ambience ──',
    'term.help.lights': '── Lighting ──',
    'term.help.visual': '── Visual devices ──',
    'term.help.atmo': '── Atmosphere / Cinematic ──',
    'term.help.av': '── A/V Projection ──',
    'term.help.gallery': '── Gallery / Library ──',
    'term.help.sys': '── System / Easter eggs ──',
    'term.help.weather': 'weather <off|light|heavy>   control rain outside',
    'term.help.curtain': 'curtain                     raise/lower electric curtain',
    'term.help.neon': 'neon                        cycle window neon colour',
    'term.help.light': 'light                       lighting mood (standard/reading/cinema/party/dark)',
    'term.help.dnd': 'dnd / quiet                 do-not-disturb — silences doorbell',
    'term.help.lantern': 'lantern                     bar mosaic lantern on/off',
    'term.help.desklamp': 'desklamp                    desk Turkish lamp 3-way: off/dim/bright',
    'term.help.wash': 'wash / pendant              bar pendant lights on/off',
    'term.help.mosaic': 'mosaic                      flip mosaic wall — next artwork (14 works)',
    'term.help.holo': 'holo                        coffee table holo projector (sphere/city/gem)',
    'term.help.ad': 'ad                          broadcast a holo ad on the skyline',
    'term.help.iris': 'iris                        IRIS holographic assistant — say a line',
    'term.help.flicker': 'flicker [off]               city neon breathing + random blackouts (default on)',
    'term.help.brownout': 'brownout                    trigger a manual district blackout',
    'term.help.thunder': 'thunder                     lightning flash + thunder + rain dip',
    'term.help.cinema': 'cinema / vista [off]        cinema mode: DOF + letterbox + subtle pan',
    'term.help.tv': 'tv [off]                    mosaic wall as TV / exit (3 local channels)',
    'term.help.cast': 'cast [wall|tv] [<YT_ID>]    stream cast — default holo TV; wall=mosaic',
    'term.help.holotint': 'holotint / tint             holo TV tint cycle (none/light/mid/deep/full blue)',
    'term.help.bgm': 'bgm <play|next>             NeuroSound music control',
    'term.help.art': 'art / gallery               wall art hint (face a frame and press E to swap)',
    'term.help.lib': 'lib / books                 bookshelf hint',
    'term.help.plan': 'plan / map                  top-down 2D floor plan (P key also works)',
    'term.help.audit': 'audit / check               placement audit (walls / floating / overlap)',
    'term.help.stats': 'stats                       show FPS / renderer / position',
    'term.help.devlog': 'devlog                      open DEV.LOG build journal',
    'term.help.viola': 'viola                       open VIOLA.ARCHIVE family recordings',
    'term.help.whoami': 'whoami / ls / cat <file>    terminal pretends there are files',
    'term.help.clear': 'clear                       clear the screen',
    'term.weather.set.prefix': '> Weather control: rain ',
    'term.weather.get.prefix': 'Current rain: ',
    'term.weather.get.suffix': ' (usage: weather off|light|heavy)',
    'term.neon.prefix': '> Neon colour → ',
    'term.curtain.close': '> Curtain: closing…',
    'term.curtain.open': '> Curtain: opening…',
    'term.holo.prefix': '> Holo projector → ',
    'term.lantern.on': '> Mosaic lantern → lit (stained glass)',
    'term.lantern.off': '> Mosaic lantern → off',
    'term.desklamp.prefix': '> Desk Turkish lamp → ',
    'term.mosaic.prefix': '> Mosaic wall → ',
    'term.holotint.prefix': '> Holo tint → ',
    'term.tv.prefix': '> Mosaic TV → ',
    'term.pendant.on': '> Bar pendant lights on',
    'term.pendant.off': '> Bar pendant lights off',
    'term.dnd.on': '> DND on — doorbell silenced',
    'term.dnd.off': '> Accepting visitors',
    'term.projector.prefix': '> Star projector → ',
    'term.plan.on': '> 2D floor plan on — triangle follows you, type plan or press P to exit',
    'term.plan.off': '> Back to 3D',
    'term.fridge.open': '> Fridge open',
    'term.fridge.close': '> Fridge closed',
    'term.lights.prefix': '> Lighting mood → ',
    'term.books': '> Books materialised — aim at a spine near the shelf and press E',
    'term.cast.noid': '> Load a track in NeuroSound first, or: cast wall <YT_ID>',
    'term.cast.wall': '> Resolving stream, casting to mosaic wall…',
    'term.cast.tv': '> Resolving stream, casting to living room…',
    'term.ad.prefix': '> Holo ad broadcast → ',
    'term.flicker.off': '> Neon flicker → off, city still as a specimen',
    'term.flicker.on': '> Neon flicker → on, three-colour slow pulse + random blackouts',
    'term.brownout.prefix': '> ',
    'term.brownout.suffix': ' (~1 s)',
    'term.thunder.prefix': '> ',
    'term.cinema.on': '> Cinema mode → on — DOF + letterbox, subtle cam drift',
    'term.cinema.off': '> Cinema mode → off',
    'term.art': '> Art is on the walls — face any frame and press E to swap',
    'term.iris.prefix': '> IRIS: "',
    'term.iris.suffix': '"',
    'term.devlog': '> Decrypting builder\'s journal…',
    'term.viola': '> Opening private recording archive',
    'term.whoami': 'V (the room\'s owner)',
    'term.ls': 'manifesto.txt  netrun.cfg  jazz.playlist  no_future/',
    'term.cat.manifesto': 'We fall asleep in neon, and wake to the sound of rain.\nThe city remembers no one, but tonight\'s synth pad belongs to me.',
    'term.cat.notfound.prefix': 'cat: ',
    'term.cat.notfound.suffix': ': no such file',
    'term.hack.suffix': '\n> ACCESS GRANTED ✔ (nothing actually happened)',
    'term.notfound.prefix': "term: command not found '",
    'term.notfound.suffix': "' — try help",

    // ── CyberOS NeuroSound ──
    'ns.cast': '📽 Cast to living room',
    'ns.search.placeholder': 'Search YouTube music… (song / artist / station)',
    'ns.search.btn': '🔍 Search',
    'ns.hint': 'Search any track, click thumbnail to play. Or paste a YouTube link.<br/>Volume follows your distance from the speakers — try standing by the window.',
    'ns.searching': '⟳ Scanning network nodes… (first search ~5 s)',
    'ns.noresult': 'No results',
    'ns.search.fail.prefix': '⛔ Search failed: ',
    'ns.cast.nosel': 'Select a track first before casting',
    'ns.cast.loading': '⟳ Resolving stream…',

    // ── Netrunner ──
    'browser.placeholder': 'https:// — some sites block embedding (X-Frame-Options)',
    'browser.ice': 'Target host refused neural connection (X-Frame-Options)<br/>Try a different node, or open in a real browser',
    'browser.bm.taipei': 'Taipei Map',
    'browser.bm.wiby': 'Wiby Retro Search',

    // ── SysMon ──
    'sysmon.quality.hint': 'Switching quality preset reloads the scene',

    // ── Gallery ──
    'gallery.loading': 'Reading data shards…',
    'gallery.searching': 'Searching collection…',
    'gallery.fail.prefix': '⛔ Collection connection failed: ',
    'gallery.decode.fail': 'This shard failed to decode — try another collector',
    'gallery.untitled': 'Untitled',
    'gallery.anon': 'Unknown artist',
    'gallery.next': '▶ Next artwork',
    'gallery.src': 'Source: The Metropolitan Museum of Art Open Access (public domain)',
    'gallery.lib.loading': '⟳ Decoding data shard…',
    'gallery.lib.more.prefix': 'Loaded ',
    'gallery.lib.more.suffix': '% <button class="more">▼ Load more</button>',
    'gallery.lib.done.prefix': '■ End of book (',
    'gallery.lib.done.suffix': 'k chars)',
    'gallery.lib.fail.prefix': '⛔ Library connection failed: ',
    'gallery.shelf.select': 'Select a book — full text via Project Gutenberg public library',
    'gallery.shelf.intro': 'Physical books are a luxury in this era.<br/>But the public library\'s database is always free.',

    // ── Viola ──
    'viola.header': '♪ Family archive — viola practice recordings (local only, not synced)',
    'viola.empty.prefix': 'Folder is empty.<br/>Drop audio files into <b style="color:#5af2ff">',
    'viola.empty.suffix': '</b><br/>Reopen this window to list them.',
    'viola.fail': 'Load failed',

    // ── NeoMail ──
    'mail.select': 'Select a message…',
    'mail.from': 'From: ',
    'mail.subj': 'Subject: ',

    // ── NeoMail messages ──
    'mail.msg.0.from': 'Landlord K',
    'mail.msg.0.subj': 'Rent Increase Notice',
    'mail.msg.0.body': "Tenant,\n\nDue to increased security fees in District 7, next quarter's rent is adjusted to ¥4,200/mo.\nNote: drone wreckage from your balcony has been removed; ¥350 will be added to your bill.\n\n— K",
    'mail.msg.1.from': 'NCPD AutoSys',
    'mail.msg.1.subj': 'Noise Complaint — Closed',
    'mail.msg.1.body': 'Your complaint filed at 03:12 regarding "mechanical footsteps from above" has been closed.\nReason: registered occupant of that floor is a combat-aug veteran — legal cyberware maintenance.\n\nHave a nice day.',
    'mail.msg.2.from': 'Drv.Chen',
    'mail.msg.2.subj': 'Re: Eye firmware',
    'mail.msg.2.body': "Usual deal — compressed it to v0.9.7, fixed the night-vision colour shift.\nBut your iris supplier went under. If it breaks again, you're replacing the whole unit.\nTake care.\n\n— Chen",
    'mail.msg.3.from': 'NEON COLA',
    'mail.msg.3.subj': "★ This Week's Deal ★",
    'mail.msg.3.body': 'Buy 2 get 1 free! New flavour "Acid Rain Lemon" is here!\nShow this message at any vending machine and enter code NEON-X.\n\n(Offer not valid in the real world)',

    // ── TV channels / holo tints ──
    'tv.ch.crt': 'CRT Orbit Track',
    'tv.ch.noise': 'Static',
    'tv.ch.ad': 'Ads',
    'tv.ch.spectrum': 'City Spectrum',
    'tv.casting': 'Casting',
    'tint.none': 'None',
    'tint.light': 'Light blue',
    'tint.mid': 'Mid blue',
    'tint.deep': 'Deep blue',
    'tint.full': 'Full blue',

    // ── city brownout ──
    'city.mat.cyan': 'Cyan-Blue',
    'city.mat.pink': 'Neon Pink',
    'city.mat.amber': 'Amber',
    'city.brownout.already': ' district already dark',
    'city.brownout.trigger': ' district lights out',

    // ── star projector ──
    'proj.off': 'Off',
    'proj.cyber': 'Cyber holo',
    'proj.cozy': 'Warm campfire',
    'proj.planet': 'Classic planetarium',

    // ── pickable object names ──
    'pick.mug': 'coffee mug',
    'pick.noodle': 'instant noodle cup',
    'pick.shard': 'purple data shard',

    // ── system/RPC fallbacks ──
    'rpc.not.loaded': '(not loaded)',
    'rpc.tv.exit.ok': 'TV mode off — back to gallery loop',
    'rpc.tv.exit.noop': 'Not in TV mode',
    'mosaic.flipping': '(switching…)',
    'mosaic.no.video': '(no video)',

    // ── package loot ──
    'package.0': '📦 NEON COLA redemption box — 24 cans, acid-rain lemon flavour',
    'package.1': '📦 Cyberware catalogue misdelivered by neighbour — bookmarked at "Nightvision Iris v2"',
    'package.2': '📦 A plastic flower bouquet, with a note: "Water me — K"',
    'package.3': '📦 Second-hand: How to Coexist With Your Smart Home',
    'package.4': '📦 Empty box. Just a note inside: "They\'re watching."',

    // ── weather text ──
    'weather.text': '{city} {temp} °C, {desc}',

    // ── lang toggle ──
    'lang.toggle': '简中',

    // ── credits panel ──
    'credits.btn': 'Credits',
    'credits.title': 'Asset Credits & Licenses',
    'credits.close': 'Close (ESC)',
    'credits.intro': 'This project bundles the third-party assets below, used and credited under their respective licenses.',
    'credits.sec.wikimedia': 'Wikimedia Commons photos (CC-BY-SA)',
    'credits.sec.wikimedia.note': 'Each photo is cropped and night-shifted before use. Original files and photographer credits live on each Commons file page. Public deployment must stay CC-BY-SA compatible.',
    'credits.sec.video': 'Wikimedia Commons video clips (CC-BY / public domain)',
    'credits.sec.cc0': 'Polyhaven & ambientCG models/textures (CC0)',
    'credits.sec.cc0.note': 'CC0 requires no attribution; listed here to record the source.',
    'credits.sec.met': 'The Metropolitan Museum of Art Open Access artworks (CC0)',
    'credits.sec.met.note': 'Filenames (met-*) are internal codenames, not the artists. Actual titles and artists are below.',
    'credits.met.filename': 'Filename',
    'credits.met.work': 'Work & artist',
    'credits.full': 'Full manifest (fetch dates, source scripts) is in THIRD_PARTY_ASSETS.md in the repository.',
  },
};

// ─── State ───────────────────────────────────────────────────────────────────
function detectLang(): Lang {
  // 1. URL ?lang=
  const urlParam = new URLSearchParams(location.search).get('lang');
  if (urlParam === 'en' || urlParam === 'zh') return urlParam;
  // 2. localStorage
  const stored = localStorage.getItem('neon-lang');
  if (stored === 'en' || stored === 'zh') return stored as Lang;
  // 3. navigator.language
  if (navigator.language.startsWith('zh')) return 'zh';
  // 4. default
  return 'en';
}

let currentLang: Lang = detectLang();

/** Translate key. Returns the key itself if not found (visible fallback). */
export function t(key: string): string {
  return dict[currentLang][key] ?? dict['zh'][key] ?? key;
}

/** Switch language, persist to localStorage, and dispatch a custom event. */
export function setLang(lang: Lang): void {
  currentLang = lang;
  localStorage.setItem('neon-lang', lang);
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  window.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
}

export function getLang(): Lang {
  return currentLang;
}

/** Mount the language toggle button in the HUD and wire the click handler.
 *  Called once from main.ts after the DOM is ready. */
export function mountLangToggle(): void {
  const btn = document.createElement('button');
  btn.id = 'lang-toggle';
  btn.textContent = t('lang.toggle');
  btn.style.cssText =
    'position:fixed;top:12px;right:12px;z-index:30;'
    + 'font-family:"Share Tech Mono",monospace;font-size:12px;'
    + 'color:#5af2ff;background:rgba(0,0,0,0.55);'
    + 'border:1px solid #5af2ff66;padding:4px 9px;cursor:pointer;'
    + 'letter-spacing:.08em;pointer-events:auto;'
    + 'transition:background .2s;';
  btn.onmouseenter = () => { btn.style.background = 'rgba(90,242,255,0.18)'; };
  btn.onmouseleave = () => { btn.style.background = 'rgba(0,0,0,0.55)'; };
  btn.onclick = () => {
    const next: Lang = currentLang === 'zh' ? 'en' : 'zh';
    setLang(next);
    btn.textContent = t('lang.toggle');
    // Reload to re-render all static strings. Instant switch for elements
    // that read `t()` reactively (toast/prompt) will happen automatically
    // via the langchange event; static HTML strings need a reload.
    location.reload();
  };
  document.body.appendChild(btn);
}
