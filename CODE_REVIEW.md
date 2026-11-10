# ScaleX 3.0 — 代码与设计审查

审查范围：`htdocs/`、`ucode/`、`luasrc/`、`luci-app-scalex-config/`、`demo/`、`scripts/`、`tests/`。
验证方式：静态检查 + Chromium / WebKit / Firefox 浏览器冒烟 + IPK 构建/解包校验 + OpenWrt 24.10 userland 安装。

## 1. 结论

**Good — 可以发布。**

ScaleX 3.0 把导航从顶部工具栏改为 macOS Settings 式侧边栏，内容从「卡片拼贴」收敛为状态面板、单条 Vitals 和分组列表。设计不再依赖彩色药丸、装饰性光晕或每卡独立阴影。仍存在两项无法在沙箱内完全验证的边界：物理路由器与真实 18.06 固件。

## 2. 设计审查

| 维度 | 结果 |
|------|------|
| 层级 | ✅ 侧边栏 → 页头 → 状态面板 → Vitals → 分组 |
| 色彩纪律 | ✅ 一个蓝色强调；绿色只用于 6px 状态点 |
| 玻璃边界 | ✅ 只在侧边栏、移动顶栏、Sheet；内容卡片不透明 |
| 字体 | ✅ 32/28/15/13/12/11，600 上限；数字 tabular |
| 响应式 | ✅ 320–1920；981px 切换侧边栏/移动栏 |
| 深色 | ✅ `#000` 画布、`#1C1C1E` 卡片、语义 token |
| 空状态 | ✅ 端口/无线缺失时隐藏对应列或整卡 |
| 可访问性 | ✅ 焦点环、`aria-current`、Sheet 焦点陷阱、搜索 label、减少动态/透明度 |

### 关键决策

- **侧边栏而不是顶部导航**：macOS 的分组习惯比「工具栏 + 下拉」更接近 Apple 后台工具，也减少了页面头部的三层堆叠。
- **一个 Vitals 面板**：四个独立小卡片是通用仪表盘的默认答案；一条四列面板更像 macOS 的分组信息。
- **状态点替代药丸**：颜色只承载状态，不承载装饰；文字保持中性色。
- **搜索是功能的**：过滤 L1/L2，不是装饰输入框。

## 3. 代码审查

| 项目 | 结果 |
|------|------|
| ucode 模板 | ✅ 真实 24.10 登录页、侧边栏、页头、静态资源 |
| LuCI 菜单归一化 | ✅ 24.10 `admin` 根节点、L2 URL、active 判断 |
| 移动 Sheet | ✅ 焦点陷阱、`inert`、Escape、焦点归还 |
| 搜索 | ✅ 输入过滤 L1/L2；Esc 清空 |
| 主题控制器 | ✅ Auto/Light/Dark；多实例按钮同步 |
| 第三方 app | ✅ `ui-scalex` 包裹表格、tabmenu、modal；跳过自有面板 |
| 18.06 Lua | ✅ 服务端顶部栏、L2 下拉、Sheet、主题切换；未实机 |
| IPK | ✅ tar.gz + USTAR、0644/0755、无 AppleDouble |
| CI | ✅ JS/Shell 语法 + 构建 + 解包校验 + Release |

### 已修复的回归点

- LuCI 24.10 菜单根节点为 `admin`，侧边栏 active/L2 URL 需要归一化。
- 视图自带 `<h2>` 与主题页头重复；只隐藏 `#maincontent` 顶层的页面级 `h2`。
- 移动 Sheet 的旧 `.scalex-sheet-group` 类与新 `.scalex-sheet-section` 不一致；legacy 与 modern 都已统一。
- `[hidden]` 被 `display:flex` 覆盖；全局 `[hidden] { display:none !important }` 修复设置页/视图切换。
- 侧边栏图标在重写 layout 时丢失 `.nav-icon` 基类；已恢复 mask 尺寸与 currentColor。

## 4. 测试记录

```text
$ ./scripts/build-ipk.sh
Built: dist/luci-theme-scalex_3.0.0-1_all.ipk (44K)
Built: dist/luci-app-scalex-config_3.0.0-1_all.ipk (3.5K)

$ ./scripts/verify-ipk.sh
OK: format luci-theme-scalex_3.0.0-1_all.ipk
OK: format luci-app-scalex-config_3.0.0-1_all.ipk
OK: luci-theme-scalex_3.0.0-1_all
OK: luci-app-scalex-config_3.0.0-1_all
All checks passed for v3.0.0

$ python tests/ui-smoke.py --channel chrome
PASS [chromium] — 8 widths, desktop, sidebar search, mobile sheet, sign-in, settings
PASS [webkit] — 8 widths, desktop, sidebar search, mobile sheet, sign-in, settings
PASS [firefox/Linux] — 8 widths, desktop, sidebar search, mobile sheet, sign-in, settings
PASS [legacy/chromium]

$ tests/real-router.sh start
ScaleX 3.0.0 — OpenWrt 24.10 sandbox
login page: 403 (403 is expected)
CSS asset:  200
# browser: login form + sidebar + page header rendered.
```

覆盖宽度：320 / 360 / 390 / 768 / 980 / 1024 / 1280 / 1440。
检查项：横向溢出、页面错误、侧边栏搜索、L2 展开、主题三态、Sheet 开关与焦点、登录主按钮颜色、设置页截图。

## 5. 剩余风险

- 物理路由器未测试；OpenWrt 24.10 容器已验证 opkg、uhttpd、登录页、侧边栏、静态资源。
- 容器内 LuCI `status/overview` 依赖 rootfs 的 view 资源，沙箱中停留在 “Loading view…”；ScaleX 仪表盘数据绑定需在完整固件回归。
- macOS Playwright Firefox 引擎无法创建 profile；Linux 容器中的 Firefox 已验证。
- 18.06 Lua 模板只做 Lua 语法检查与静态 fixture 测试，未在真实 18.06 固件运行。
- 移动 Sheet 在 iOS Safari 的 `inert` 与 `backdrop-filter` 仍需实机确认。

## 6. 后续建议

1. 在物理 OpenWrt 23.05 / 24.10 上回归仪表盘 RPC 与移动 `inert`。
2. 用第三方 app（Docker、OpenClash、AdGuard Home、Statistics）做页面级回归。
3. 增加 iOS Safari / VoiceOver 实机检查。
4. 若固件空间允许，加入 CSS 压缩；当前未压缩便于审计。
