# luci-theme-echo

[![Build IPK](https://github.com/Jas0n0ss/openwrt-theme-echo/actions/workflows/build.yml/badge.svg)](https://github.com/Jas0n0ss/openwrt-theme-echo/actions/workflows/build.yml)

**Echo 2.0** — 一款贴近 Apple 视觉语言的 OpenWrt / LuCI 主题。
Liquid Glass 工具栏、网络状态光晕、Apple 风格表单与原生感移动端菜单。

**当前版本：** `2.0.1`

![Echo 2.0 浅色概览](docs/preview.jpg)

---

## 为什么是 Echo 2.0

| 设计目标 | 实现 |
|----------|------|
| **一眼看懂网络状态** | 概览页首屏给出在线状态、WAN / Wi-Fi / 客户端摘要，以及 CPU、内存、运行时间、客户端四项 Vitals |
| **Apple 式层级** | 34px 大标题、11px eyebrow、发丝分隔线、连续圆角、唯一强调色 |
| **只在功能层使用玻璃** | 顶部导航、下拉、移动端 Sheet 使用 Liquid Glass；卡片和表单保持不透明，优先保证可读性 |
| **真正可用的移动端** | ≤980px 切换为「浏览」Sheet，分组展开、焦点陷阱、Escape 关闭、触控目标 ≥44px |
| **完整深色模式** | Auto / Light / Dark 三态；深色不是反色，使用独立表面与文字层级 |
| **不牺牲 LuCI 功能** | 保留 Bootstrap CBI / 表格 / 表单底座，第三方插件通过 `ui-echo.js` 自动适配 |
| **可访问** | 跳过导航、可见焦点、键盘下拉、`prefers-reduced-motion`、`prefers-reduced-transparency`、表格移动端重排 |

**深色模式**

![Echo 2.0 深色概览](docs/preview-dark.jpg)

**登录页**

![Echo 2.0 登录页](docs/login.jpg)

**移动端**

<img src="docs/preview-mobile.jpg" alt="Echo 2.0 移动端" width="320">

---

## 兼容性

| 固件 | 模板 | 状态 |
|------|------|------|
| OpenWrt 23.05+ / 24.x | `ucode/*.ut` | ✅ 推荐 |
| ImmortalWrt | `ucode/*.ut` | ✅ |
| OpenWrt 22.03 | `ucode/*.ut` | ⚠️ 基本可用，未在 CI 覆盖 |
| LEDE 18.06 / Lean | Lua `luasrc/` | ⚠️ 基础兼容层（服务端导航 + 移动 Sheet），未实机覆盖 |

依赖：`luci-theme-bootstrap`（提供 CBI / 表单 / 表格底座，固件一般已自带）。

### 已验证环境

| 环境 | 结果 |
|------|------|
| OpenWrt 24.10 x86_64 rootfs + `uhttpd` + `ucode`（Docker/QEMU） | ✅ IPK 安装、登录页、静态资源、ucode 模板 |
| WebKit 27.2（Safari 引擎） | ✅ 8 个宽度、主题切换、移动 Sheet |
| Firefox 157（Linux Playwright 容器） | ✅ 桌面/移动布局、Sheet、无溢出 |
| 物理路由器 | ⚠️ 未覆盖 |

> 容器测试使用真实 OpenWrt 24.10 userland，但不是物理路由器；`tests/real-router.sh` 可复现。

---

## 安装

### 方式 A：预编译 `.ipk`（推荐）

从 [Releases](https://github.com/Jas0n0ss/openwrt-theme-echo/releases) 下载：

```sh
opkg install luci-theme-echo_2.0.1-1_all.ipk
opkg install luci-app-echo-config_2.0.1-1_all.ipk

uci set luci.main.mediaurlbase='/luci-static/echo'
uci commit luci
/etc/init.d/uhttpd restart
```

然后在 **System → System → Language and Style → Design** 选择 **Echo**。

### 方式 B：编译进固件

```sh
cd openwrt/package
git clone https://github.com/Jas0n0ss/openwrt-theme-echo.git luci-theme-echo
cp -r luci-theme-echo/luci-app-echo-config .

make menuconfig
# LuCI → Themes → luci-theme-echo
# LuCI → Applications → luci-app-echo-config

make package/luci-theme-echo/compile V=s
make package/luci-app-echo-config/compile V=s
```

### 中文界面

IPK 内置 `zh_Hans` 翻译，无需额外安装语言包：

```sh
uci set luci.main.lang='zh_Hans'
uci commit luci
/etc/init.d/uhttpd restart
```

---

## 主题配置

**System → Echo Theme**，或使用 UCI：

```sh
uci set echo.global.primary='#0071E3'
uci set echo.global.dark_primary='#0A84FF'
uci set echo.global.font_size='16'
uci set echo.global.background_mode='gradient'   # gradient | none | custom
uci set echo.global.dashboard='1'
uci commit echo
```

自定义背景：把图片放到 `/www/luci-static/echo/background/bg.jpg`（也支持 `.png` / `.webp`），然后选择 `custom`。主题会自动叠加可读性遮罩。

---

## 本地预览

```sh
./demo/serve.sh
# http://127.0.0.1:9080/demo/
```

- `概览` / `主题设置` / `登录` 三个视图
- 右下角浮层可切换视图
- `?clean=1` 隐藏浮层，用于截图
- 支持 `localStorage` 主题偏好

---

## 构建与测试

```sh
# 1. 构建 IPK（自动编译 zh_Hans .lmo）
./scripts/build-ipk.sh

# 2. 校验包内容、资源、i18n、2.0 组件
./scripts/verify-ipk.sh

# 3. JS 语法检查
find htdocs/luci-static/resources demo -name '*.js' -exec node --check {} \;

# 4. 可选：浏览器 UI 冒烟测试
python3 -m venv .venv
.venv/bin/pip install -r tests/requirements.txt
.venv/bin/python tests/ui-smoke.py --base-url http://127.0.0.1:9080/demo/ --channel chrome
.venv/bin/python tests/ui-smoke.py --base-url http://127.0.0.1:9080/demo/ --engine webkit
.venv/bin/python tests/legacy-smoke.py --base-url http://127.0.0.1:9080/tests/fixtures/legacy.html

# 5. 可选：真实 OpenWrt 24.10 userland（需要 Docker + QEMU）
./tests/real-router.sh start
# http://127.0.0.1:18080/cgi-bin/luci/  root / root
./tests/real-router.sh stop
```

测试覆盖：

- 320 / 360 / 390 / 768 / 980 / 1024 / 1280 / 1440px：无横向溢出
- 桌面下拉菜单、主题三态、移动 Sheet 开关与焦点
- 登录按钮强调色、表单可访问性
- 截图输出到 `tests/artifacts/`

---

## 项目结构

```
openwrt-theme-echo/
├── .github/workflows/build.yml       # CI：构建 + 校验 + Release
├── htdocs/luci-static/echo/
│   ├── css/                          # 设计 token、壳层、组件、仪表盘
│   ├── icons/menu/                   # LuCI 菜单图标
│   ├── img/                          # Echo 标记、favicon、符号集
│   └── ...
├── htdocs/luci-static/resources/
│   ├── menu-echo.js                  # 导航 / 下拉 / 移动 Sheet
│   ├── theme-echo.js                 # Auto / Light / Dark
│   ├── dashboard-echo.js             # Hero / Vitals / 网络面板
│   ├── ui-echo.js                    # 第三方 app 适配
│   └── menu-bootstrap-core.js
├── luasrc/view/themes/echo/          # Lua / LuCI 18.06 基础兼容层
├── htdocs/luci-static/echo/js/legacy.js
├── ucode/template/themes/echo/       # header / footer / sysauth
├── luci-app-echo-config/             # 主题配置应用
├── demo/                             # 无路由器预览
├── docs/                             # 预览图
├── scripts/                          # 构建、校验、发布
├── tests/                            # Playwright 冒烟测试 + 真实 router 沙箱
└── DESIGN.md                         # 设计规范
```

---

## CI 与 Release

推送到 `main` / `master`、打 `v*` 标签或手动触发时：

1. `node --check` 检查全部前端 JS
2. 构建两个 `.ipk`
3. `verify-ipk.sh` 校验包格式、权限、资源、i18n、2.0 组件
4. 上传 Actions Artifacts
5. 自动创建 GitHub Release，附带两个 `.ipk`

手动触发：**Actions → Build IPK → Run workflow**

---

## 文档

- [DESIGN.md](DESIGN.md) — 设计规范、token、组件、无障碍
- [CODE_REVIEW.md](CODE_REVIEW.md) — 2.0 审查、修复项、测试记录、已知边界
- [CHANGELOG.md](CHANGELOG.md) — 版本变更

---

## License

[Apache License 2.0](LICENSE)

OpenWrt 是 OpenWrt 项目的注册商标。Echo 是独立主题项目，与 Apple Inc. 无关联。
