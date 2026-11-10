# Changelog

## 2.1.0 — 2026-11-10

Theme renamed to **ScaleX**.

### Changed

- Package names: `luci-theme-scalex` / `luci-app-scalex-config`.
- Asset path: `/luci-static/scalex`; UCI config `/etc/config/scalex`.
- CSS tokens/classes: `--scalex-*`, `.scalex-*`, `#scalex-*`.
- JS modules: `menu-scalex.js`, `theme-scalex.js`, `dashboard-scalex.js`, `ui-scalex.js`.
- Appearance key: `scalex-theme`; theme name registered as `ScaleX`.
- Repository moved to `Jas0n0ss/openwrt-theme-scalex`.
- Version starts at 2.1.0 for the renamed package.

### Migration

- Remove the previous theme/config packages before installing ScaleX.
- Existing UCI settings are not migrated automatically; reapply accent, font and background options.

## 2.0.1 — 2026-11-09

Real OpenWrt 24.10 install and runtime fixes, plus Safari/WebKit and Firefox coverage.

### Fixed

- **IPK format**: OpenWrt 24.10's opkg rejected the old GNU ar wrapper. Packages are now modern gzipped tars containing `debian-binary`, `data.tar.gz` and `control.tar.gz`, built with USTAR (no PAX typeflag `x`).
- **File permissions**: packaged files are normalised to `0644` and directories to `0755`; previously new SVG/CSS files could be installed as `0600`, causing uhttpd 403 responses.
- **Login template**: removed `http.prepare_content()` and `ubus.call()` from the sysauth scope (neither exists there); hostname now comes from `/proc/sys/kernel/hostname`; form posts to the current URL instead of the non-existent `/login`.
- **Footer**: replaced unsupported regex-literal tests with `lc()` + `index()`; `version.distname` handling now works on real ucode.
- **Header**: include LuCI's translations endpoint and `cbi.js` (`String.prototype.format`); without them `L.require()` failed and the navigation never rendered.
- **Menu core**: `menu-bootstrap-core.js` returned a plain object; LuCI 24.10 requires a `baseclass` constructor. It is now a proper class.
- **Dashboard injection**: place the hero after security alerts, not before them.
- **UI enhancer**: do not double-wrap ScaleX's own dashboard tables.
- **UCI defaults**: restore executable bit; first-install theme registration now runs.

### Added

- Real OpenWrt 24.10 userland test harness (`tests/real-router.sh`) using `uhttpd` + `ucode` in a disposable container.
- Safari/WebKit and Firefox (Linux Playwright container) smoke runs.
- Basic Lua/LuCI 18.06 compatibility shell (`luasrc/`, `legacy.css`, `legacy.js`) with server-rendered navigation, tabs, theme switch and mobile sheet.
- `tests/legacy-smoke.py` and a static legacy fixture.

### Changed

- 2.0.0 remains the visual release; 2.0.1 is the installable release. The broken v2.0.0 GitHub release is superseded.

## 2.0.0 — 2026-11-09

ScaleX 2.0 是一次完整的视觉与交互重做。

### Added

- Apple 风格 OpenWrt 概览页：网络光晕 Hero、CPU / 内存 / 运行时间 / 客户端 Vitals。
- Liquid Glass 顶部导航、L2 下拉、移动端浏览 Sheet。
- Auto / Light / Dark 三段外观控件。
- 320–1920px 响应式布局；移动端表格重排为键值列表。
- 键盘可用的下拉菜单与 Sheet 焦点陷阱。
- `prefers-reduced-motion`、`prefers-reduced-transparency`、`prefers-contrast` 支持。
- 自绘 ScaleX 标记、favicon 与 15 个单色符号。
- 登录页密码显示/隐藏、主题切换。
- Playwright UI 冒烟测试与截图产物。
- 深色模式截图与完整设计规范。

### Changed

- 根字号 16px，正文 15px；统一 Apple 类型层级。
- 所有颜色、间距、圆角、阴影、动效改为三层 token。
- LuCI 表单改为 inset grouped 风格；Flag 复选框改为 Apple 开关。
- 网络地图端口/无线改为 inset 卡片，不再给每个内容模块加玻璃。
- 页面标题在有二级菜单时仍然显示。
- 配置应用简化为强调色、字号、仪表盘、背景四项。
- OpenWrt 默认强调色从青色改为 `#0071E3`。

### Fixed

- 修复 `glass.css` 非法 `@media` 嵌套。
- 修复 Bootstrap `body { display:flex }` 导致的宽度异常。
- 修复按钮变体被基础选择器覆盖（灰色/绿色主按钮）。
- 修复移动端导航横向溢出。
- 修复移动端表格缺少 `data-label`。
- 修复 Sheet `hidden` 被 `display:flex` 覆盖。
- 修复登录页主题切换无效。
- 修复 IPK 中混入 macOS `._*` 文件。
- 移除旧版 LEDE Lua 模板与 `dark.css`。

### Removed

- ASUS / BE88U 式深蓝侧栏、金色型号标签、青色仪表盘预设。
- `luasrc/` 旧版模板（2.0 起仅支持 ucode）。
