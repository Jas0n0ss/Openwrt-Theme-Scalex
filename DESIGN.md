# ScaleX 5.0 — 设计规范

> 一款为 OpenWrt / LuCI 打造的简约极客风主题。
> 设计命题：**像读一份干净的终端输出，一眼看到 WAN 与 LAN 是否通。**

![ScaleX 5.0 浅色预览](docs/preview.jpg)

---

## 1. 设计方向

**纸面与墨色，一个信号色，发丝线，方角，等宽数字。**

ScaleX 5.0 把 4.0 的 Apple / Liquid Glass 语言整体收回：没有玻璃模糊、没有渐变、没有彩色光斑、没有投影。导航仍在顶部，但只剩一行等宽小字；首页第一屏是 WAN 与 LAN 两张开卡，其余指标依次下移。

| 原则 | 落地 |
|------|------|
| **链路优先** | 首屏第一块内容就是 WAN / LAN；地址、网关、在线时长、流量、客户端与端口都在卡内 |
| **一个信号色** | 绿只表示「可达 / 已连接」；橙表示降级，红表示断开；其余全部是墨色层级 |
| **规则代替装饰** | 1px 分隔线与边框构成层次，不用阴影、模糊与渐变 |
| **方角** | 2–8px，只够 soften 边缘；没有胶囊、没有 squircle |
| **等宽数据** | IP、速率、运行时间、状态标签用 mono + `tabular-nums`；正文用系统 sans |
| **安静** | 小字号、大写标签、0.1em 字距，靠排版建立层级而不是靠颜色 |

### 签名元素

点阵画布 + 一行 `ONLINE / 主机名 / 固件 / 运行时间` 的系统状态行 + `WAN`、`LAN` 两张开卡，卡顶一条 2px 状态色带。

---

## 2. 颜色

| Token | 浅色 | 深色 | 用途 |
|-------|------|------|------|
| `--scalex-bg` | `#F7F7F8` | `#08080A` | 页面画布（叠加 24px 点阵） |
| `--scalex-bg-elevated` | `#FFFFFF` | `#0F0F12` | 卡片、菜单、Sheet |
| `--scalex-bg-inset` | `#F1F1F2` | `#16161A` | 输入框、分段控件 |
| `--scalex-text` | `#111114` | `#EDEDF0` | 主文字 |
| `--scalex-text-secondary` | `#5C5C64` | `#9B9BA3` | 说明、标签、表头 |
| `--scalex-text-tertiary` | `#6F6F78` | `#7C7C85` | 注释、fact 标签 |
| `--scalex-accent` | `#0A8F4D` | `#2ED97C` | 在线、主操作、选中、焦点 |
| `--scalex-accent-text` | `#06703B` | `#5CEB9B` | 强调文字（保证对比） |
| `--scalex-on-accent` | `#FFFFFF` | `#05130A` | 绿底上的文字 |
| `--scalex-warning` | `#B4690E` | `#F5B544` | 降级、半连接 |
| `--scalex-danger` | `#C62F2A` | `#FF5C57` | 断开、错误 |
| `--scalex-separator` | `#E3E3E6` | `#24242A` | 发丝分隔线 |
| `--scalex-grid-dots` | `rgba(17,17,20,.055)` | `rgba(255,255,255,.045)` | 画布点阵 |

对比度：主文字 15.9:1（浅）/ 16.4:1（深）；次要文字 6.4:1（浅）/ 6.1:1（深）；`--scalex-accent-text` 在 accent-soft 底上 ≥ 5.4:1。深色主按钮使用 `--scalex-on-accent`（近黑）而不是白字。

**规则：绿色只代表「通」，不用于装饰。** 需要非状态强调时使用墨色（加粗、字距、边线），不加第二种彩色。

---

## 3. 字体

- 正文：`system-ui, -apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`
- 数据与标签：`ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace`
- 所有数字 `font-variant-numeric: tabular-nums`，避免轮询刷新时跳动。

| 角色 | 字号 | 字重 / 字距 |
|------|------|-------------|
| 页面标题 | 24px（桌面 30px） | 600 / `-0.01em` |
| WAN·LAN 地址 | 20px mono | 600 |
| 区块标题（LINKS / PORTS） | 11px mono 大写 | 500 / `0.1em` |
| 系统状态行 | 11px mono | 400 / `0.01em` |
| 正文 | 14px | 400 |
| 表格 | 12–13px | 400 |
| 表头 / 卡内标签 | 10px mono 大写 | 500 / `0.08em` |
| 注释 | 11px | 400，tertiary |

中文不额外加字距；等宽字体只用于数据与英文标签本身。

---

## 4. 布局

### 4.1 桌面（≥ 901px）

```text
┌──────────────────────────────────────────────────────────────────────┐
│  ▣ SCALEX    状态  系统  服务  网络  统计         ◐ ☀ ☾   └─ 退出   │  48px 实色顶栏
│               ────                                                   │
├──────────────────────────────────────────────────────────────────────┤
│  ~/ 状态                                                             │
│  概览                                                                │
│  ■ ONLINE / ScaleX-Router / OpenWrt 24.10 / UP 3D 14H                │  系统状态行
│  ──────────────────────────────────────────────────────────────────  │
│  LINKS                                          LIVE · 10S           │
│  ┌────────────────────────────┬──────────────────────────────────┐  │
│  │ WAN                     ■UP │ LAN                          ■UP │  │  2px 状态色带
│  │ 203.0.113.42/32            │ 192.168.1.1/24                   │  │  mono 20px
│  │ wan · PPPoE · eth0         │ lan · Static · br-lan           │  │
│  │ 网关 203.0.113.1 │ 在线 18h │ 客户端 3 │ 端口 4/5           │  │
│  │ 下行 18.2 GB     │ 上行 6.4GB│ 下行 42.1GB │ 上行 38.5GB    │  │
│  └────────────────────────────┴──────────────────────────────────┘  │
│  CPU LOAD │ MEM 58% │ UP 3D 14H │ CLIENTS 3                          │  四格指标
│  PORTS & RADIOS                                                      │
│  INTERFACES                              │ CLIENTS                  │
└──────────────────────────────────────────────────────────────────────┘
       最大 1180px 内容区，页面左右留白 32px
```

- 顶栏 48px 实色，底部 1px 线；品牌等宽 13px 大写，L1 链接 12px。
- L2 菜单为实心卡片（`--scalex-bg-elevated`），4px 圆角，1px 边线 + 轻投影。
- 内容区最大 1180px；标题、卡片同轴。
- 面包屑等宽 10px 大写，前缀 `~/`（绿色）。

### 4.2 移动（≤ 900px）

- 顶栏 46px：品牌 + 外观分段 + 菜单按钮；退出进 Sheet。
- L2 变成标题下的分段控件，可横向滚动。
- 首页顺序不变：状态行 → WAN → LAN → 指标 → 端口 → 表格。
- ≤720px：WAN / LAN 单列堆叠；≤640px：表格转为 label + 值，label 列固定 64px。
- 页面留白 32 → 20 → 16px；标题 30 → 24 → 20px。

### 4.3 18.06 legacy

Lua 模板仍是服务端顶栏壳层，共用同一套 token、状态点、表格与 Sheet 结构。

---

## 5. 组件

### 5.1 顶栏与导航
- 背景 `--scalex-bg-elevated`，底部 1px；无 `backdrop-filter`。
- L1：12px，padding 12px；当前项文字加深 + 2px 绿下划线，紧贴底边（`bottom: -1px`）。
- 品牌标记 26px / 3px 圆角；等宽大写。
- L2 菜单：实心卡、4px 圆角、34px 行高；悬停 / 聚焦 / 点外部关闭。

### 5.2 系统状态行
- 一行 mono 11px：`■ ONLINE / 主机名 / 固件 / 运行时间`。
- 状态词等宽大写 0.12em：`ONLINE`（绿）、`OFFLINE`（橙）、`NO WAN`（红）。
- 状态点 5px 方块；分隔符 `/` 为 tertiary。

### 5.3 WAN / LAN 链路卡（首屏核心）
- 2 列网格（≤720px 单列），每卡 1px 边框、4px 圆角、无阴影。
- 卡片顶部 2px 状态色带：`.is-up` 绿、`.is-down` 橙、`.is-off` 灰（`::before` 实现）。
- 头部：等宽大写 tag（`WAN` / `LAN`）+ 右侧状态（5px 方块 + `UP` / `DOWN` / `N/A`）。
- 地址 20px mono 600；副行 `接口 · 协议 · 设备` mono 11px。
- 事实区 `dl` 两列：`dt` 10px mono 大写 tertiary，`dd` mono 12px，右对齐；格间用发丝线分隔。
- WAN 事实：网关 / 在线 / 下行 / 上行。LAN 事实：客户端 / 端口 / 下行 / 上行。

### 5.4 指标（Vitals）
- 四格，2×2（≤900px）；每格 1px 边框拼接，内侧不留缝。
- 标签 10px mono 大写 + 14px 线性符号；数值 18–24px mono；注释 11px。
- 内存条 2px，仅内存格；绿 → 橙 → 红随水位变化。

### 5.5 端口与射频
- 一张卡两列（≤720px 上下堆叠）。
- 行高 36px，发丝线分隔；状态点 + 名称 + 速率/频段 + 角色/SSID。
- 无端口或无射频时隐藏对应列，两者皆无则整卡隐藏。

### 5.6 表格
- 表头 10px mono 大写 0.08em，透明底，1px 下边线。
- 行 40px；地址列用 mono，副行显示 `↓ rx · ↑ tx`。
- 状态列用 `.label`：无底色、mono 大写、5px 方块前缀。
- 移动端 `data-label` 转 label/value 两列，label 64px，值左对齐。

### 5.7 表单与开关
- 输入框 32–36px，1px 边线、3px 圆角、inset 底；聚焦 3px 绿色软环。
- 开关：38×22 方形成 toggle，选中绿底 + 绿块；不使用 iOS 圆形滑杆。
- 按钮：透明底 + 1px 边线 + 3px 圆角；主按钮绿底 + `--scalex-on-accent` 文字。
- 设置页：190px 标签列 + 内容列；分组卡用边线而不是阴影。

### 5.8 移动 Sheet
- 底部 8px 上圆角，实心背景，无模糊；最大宽 520px。
- grabber 32×3 方条；标题 18px；关闭按钮 30px 边线方框。
- 打开时 `inert` 主界面，焦点进入关闭按钮，`Esc` 关闭。

### 5.9 登录页
- 380px 单卡，1px 边线，8px 圆角，无阴影，直接坐在点阵画布上。
- 品牌标记 44px；主机名 18px mono；副标题/提示 11px mono。
- 输入 44px 高、mono；主按钮 44px 全宽；错误条为 2px 左边线的方框。
- ≤520px 卡片去掉边框与底色，直接平铺。

---

## 6. 动效

| 场景 | 时长 / 曲线 |
|------|-------------|
| 内容进入 | 320ms / `cubic-bezier(.22,.8,.24,1)`，6px 上移 + 淡入 |
| Sheet 打开/关闭 | 320ms / 同曲线 |
| 悬停、按压 | 140ms / ease-out（只变色，不缩放） |
| L2 菜单 | 140ms / 透明度 + 2px 位移 |

- 没有持续呼吸、漂浮或装饰性循环动画。
- `prefers-reduced-motion: reduce` 关闭位移与过渡。
- `prefers-reduced-transparency: reduce` 与不支持 `backdrop-filter` 的环境下，菜单与 Sheet 一律实色。

---

## 7. 可访问性

- 跳过导航链接；焦点环 2px 绿 + 2px offset。
- 当前页 `aria-current="page"`；L2 可键盘展开，`Esc` 关闭。
- 移动 Sheet：`role=dialog`、`aria-modal`、焦点陷阱、关闭后归还焦点。
- 触控目标：移动 ≥ 44px；桌面控件 ≥ 28px。
- 状态不只靠颜色：点旁始终有 `UP` / `DOWN` / `N/A` 文本。
- 表格移动端保留语义（`caption` + `data-label`）。

---

## 8. 文件结构

```text
htdocs/luci-static/scalex/
├── css/
│   ├── variables.css       # token（颜色、字号、间距、半径、点阵）
│   ├── base.css            # reset、字体、点阵画布、焦点
│   ├── layout.css          # 顶栏、页头、分段控件、Sheet
│   ├── glass.css           # 仅 scrim（无玻璃的入口占位）
│   ├── components.css      # LuCI 表单、按钮、表格、方形开关
│   ├── dashboard.css       # 状态行、WAN/LAN 卡、指标、端口、表格
│   ├── login.css           # 登录页
│   ├── adaptive.css        # 第三方 LuCI app 适配
│   ├── openwrt.css         # OpenWrt 预设
│   ├── symbols.css         # 线性符号
│   └── legacy.css          # 18.06 兼容
├── js/legacy.js            # 18.06 交互
├── img/                    # 标记、favicon、符号集
└── icons/menu/             # 菜单图标
```

```text
htdocs/luci-static/resources/
├── menu-bootstrap-core.js  # LuCI 菜单树归一化
├── menu-scalex.js          # 顶栏 / L2 菜单 / 移动 Sheet
├── theme-scalex.js         # Auto / Light / Dark
├── dashboard-scalex.js     # RPC、状态行、WAN/LAN、指标、端口、表格
└── ui-scalex.js            # 第三方页面适配
```

---

## 9. DOM 契约（dashboard）

| 选择器 | 内容 |
|--------|------|
| `#scalex-overview` | 概览注入容器 |
| `.scalex-meta` | 系统状态行 |
| `#scalex-meta-host` / `#scalex-meta-fw` / `#scalex-meta-uptime` | 主机名 / 固件 / 运行时间 |
| `#scalex-wan-card` / `#scalex-lan-card` | 链路卡（`.is-up` / `.is-down` / `.is-off`） |
| `#scalex-wan-state` / `#scalex-lan-state` | 状态点 + 文案 |
| `#scalex-wan-ip` / `#scalex-lan-ip` | 地址（mono 20px） |
| `#scalex-wan-sub` / `#scalex-lan-sub` | 接口 · 协议 · 设备 |
| `#scalex-wan-gw` / `#scalex-wan-uptime` | 网关 / 在线时长 |
| `#scalex-wan-rx` / `#scalex-wan-tx` / `#scalex-lan-rx` / `#scalex-lan-tx` | 上下行 |
| `#scalex-lan-clients` / `#scalex-lan-ports` | 客户端数 / 端口占用 |
| `#scalex-vital-cpu-value` (`-note`) | CPU 指标 |
| `#scalex-vital-memory-value` (`-note` / `-bar`) | 内存指标 |
| `#scalex-vital-uptime-value` / `#scalex-vital-clients-value` | 运行时间 / 客户端 |

刷新节奏 10s；数据源 `system.info`、`system.board`、`network.interface.dump`、`luci-rpc getDHCPLeases`、`network.device.status`、`luci getBuiltinEthernetPorts`。

---

## 10. 约束

- 主路径：OpenWrt 23.05 / 24.10 / ImmortalWrt，ucode 模板。
- LuCI 24.10 菜单根节点是 `admin`；所有路径与 active 判断都要归一化。
- 不依赖外部字体、图片 CDN 或运行时 CSS-in-JS。
- 功能层不使用 `backdrop-filter`；只有 `.scalex-scrim` 保留半透明。
- 18.06 只做基础兼容，不在 CI 中跑真实固件。
