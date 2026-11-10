# ScaleX 4.0 — 代码与设计审查

审查范围：`htdocs/`、`ucode/`、`luasrc/`、`luci-app-scalex-config/`、`demo/`、`scripts/`、`tests/`。
验证方式：静态检查 + Chromium / WebKit / Firefox 浏览器冒烟 + IPK 构建/解包校验 + OpenWrt 24.10 userland 安装。

## 1. 结论

**Good — 可以发布。**

4.0 把主导航放回顶部：桌面为 Apple.com 式居中横向菜单，L2 在悬停/聚焦时展开为玻璃菜单；手机保留顶部品牌栏与菜单按钮，L2 变成标题下的分段控件。侧边栏和底部 Tab Bar 已删除。仍有两项无法在沙箱内完全验证：物理路由器与真实 18.06 固件。

## 2. 设计审查

| 维度 | 结果 |
|------|------|
| 层级 | ✅ 顶部导航 → 页头 → 状态面板 → Vitals → 分组 |
| 色彩纪律 | ✅ 一个蓝色强调；绿色只用于 6px 状态点 |
| 玻璃边界 | ✅ 只在顶部导航、L2 菜单、移动 Sheet；内容卡片不透明 |
| 字体 | ✅ 32/28/15/14/13/12/11，600 上限；数字 tabular |
| 响应式 | ✅ 320–1920；901px 切换桌面顶栏/手机菜单 |
| 深色 | ✅ `#000` 画布、`#1C1C1E` 卡片、语义 token |
| 空状态 | ✅ 端口/无线缺失时隐藏对应列或整卡 |
| 可访问性 | ✅ 焦点环、`aria-current`、L2 键盘、Sheet 焦点陷阱、减少动态/透明度 |

### 关键决策

- **顶部而不是侧边栏**：按用户要求回到顶部；使用 Apple.com 的低存在感横条，而不是填充药丸。
- **L2 只在需要时出现**：桌面悬停/聚焦展开玻璃菜单；手机变成标题下的分段控件。
- **一个 Vitals 面板**：四张独立小卡片是通用仪表盘的默认答案；一条四列面板更像 Apple 的分组信息。
- **状态点替代药丸**：颜色只承载状态，不承载装饰。

## 3. 代码审查

| 项目 | 结果 |
|------|------|
| ucode 模板 | ✅ 真实 24.10 登录页、顶部导航、页头、静态资源 |
| LuCI 菜单归一化 | ✅ 24.10 `admin` 根节点、L2 URL、active 判断 |
| 顶部导航 | ✅ L1 active、L2 hover/focus、触屏点击、Escape、外部点击关闭 |
| 移动 Sheet | ✅ 焦点陷阱、`inert`、Escape、焦点归还 |
| 主题控制器 | ✅ Auto/Light/Dark；多实例按钮同步 |
| 第三方 app | ✅ `ui-scalex` 包裹表格、tabmenu、modal；跳过自有面板 |
| 18.06 Lua | ✅ 服务端顶部导航、L2 hover/focus 菜单、移动 Sheet；未实机 |
| IPK | ✅ tar.gz + USTAR、0644/0755、无 AppleDouble |
| CI | ✅ JS/Shell 语法 + 构建 + 解包校验 + Release |

### 已修复的回归点

- LuCI 24.10 菜单根节点为 `admin`，顶部导航 active/L2 URL 需要归一化。
- LuCI 视图自带 `<h2>` 与主题页头重复；只隐藏 `#maincontent` 顶层的页面级 `h2`。
- 移动 Sheet 的 `.scalex-sheet-section` 与 18.06 旧类不一致；modern/legacy 已统一。
- `[hidden]` 被 `display:flex` 覆盖；全局 `[hidden] { display:none !important }` 修复视图切换。
- 顶部导航重写后 `.nav-icon` 基类丢失；已恢复 mask 尺寸与 currentColor。
- 顶部导航在 900px 以下隐藏，菜单按钮/Sheet 接管；18.06 同样处理。

## 4. 测试记录

```text
$ ./scripts/build-ipk.sh
Built: dist/luci-theme-scalex_4.0.0-1_all.ipk (43K)
Built: dist/luci-app-scalex-config_4.0.0-1_all.ipk (3.5K)

$ ./scripts/verify-ipk.sh
OK: format luci-theme-scalex_4.0.0-1_all.ipk
OK: format luci-app-scalex-config_4.0.0-1_all.ipk
OK: luci-theme-scalex_4.0.0-1_all
OK: luci-app-scalex-config_4.0.0-1_all
All checks passed for v4.0.0

$ python tests/ui-smoke.py --channel chrome
PASS [chromium] — 8 widths, desktop top nav, mobile sheet, sign-in, settings
PASS [webkit] — 8 widths, desktop top nav, mobile sheet, sign-in, settings
PASS [firefox] — 8 widths, desktop top nav, mobile sheet, sign-in, settings

$ python tests/legacy-smoke.py
PASS [legacy/chromium] — top nav, L2 hover menu, mobile sheet
PASS [legacy/webkit]

$ tests/real-router.sh start
ScaleX 4.0.0 — OpenWrt 24.10 sandbox
login page: 403 (403 is expected)
CSS asset:  200
# browser: top bar + L2 menu + mobile sheet, no page errors.
```

覆盖宽度：320 / 360 / 390 / 768 / 980 / 1024 / 1280 / 1440。
检查项：横向溢出、页面错误、顶部导航 L2、主题三态、移动 Sheet 开关与焦点、登录主按钮颜色、设置页截图。

## 5. 剩余风险

- 物理路由器未测试；OpenWrt 24.10 容器已验证 opkg、uhttpd、登录页、顶部导航、静态资源。
- 容器内 LuCI `status/overview` 依赖 rootfs 的 view 资源，沙箱中停留在 “Loading view…”；ScaleX 仪表盘数据绑定需在完整固件回归。
- macOS Playwright Firefox 引擎无法创建 profile；Linux 容器中的 Firefox 已验证。
- 18.06 Lua 模板只做 Lua 语法检查与静态 fixture 测试，未在真实 18.06 固件运行。
- 移动 Sheet 在 iOS Safari 的 `inert` 与 `backdrop-filter` 仍需实机确认。

## 6. 后续建议

1. 在物理 OpenWrt 23.05 / 24.10 上回归仪表盘 RPC 与移动 `inert`。
2. 用第三方 app（Docker、OpenClash、AdGuard Home、Statistics）做页面级回归。
3. 增加 iOS Safari / VoiceOver 实机检查。
4. 若固件空间允许，加入 CSS 压缩；当前未压缩便于审计。
