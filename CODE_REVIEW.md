# Echo 2.0 — 代码与设计审查

审查范围：`htdocs/`、`ucode/`、`luci-app-echo-config/`、`demo/`、`scripts/`、`tests/`。
验证方式：静态检查 + 本地浏览器（Chrome / Playwright）+ IPK 构建与解包校验。
未覆盖：真实 OpenWrt 路由器上的 uhttpd / rpcd 运行、不同 LuCI 插件组合、Safari / Firefox 实机。

---

## 1. 结论

| 维度 | 结论 |
|------|------|
| 设计一致性 | ✅ Token 化完成，组件不写死颜色/字号/圆角 |
| 深色模式 | ✅ 独立表面与文字层级，非反色 |
| 响应式 | ✅ 320–1920px 无横向溢出 |
| 无障碍 | ✅ 焦点、键盘下拉、Sheet 焦点陷阱、减少动态 |
| 包完整性 | ✅ 构建、i18n、资源校验通过 |
| 真实固件 | ⚠️ 未在路由器上做 ucode 运行测试 |

---

## 2. 本轮修复

| 问题 | 影响 | 处理 |
|------|------|------|
| `glass.css` 中 `html[data-theme="dark"], @media (...)` 非法选择器 | 深色玻璃规则可能整段失效 | 拆分选择器，删除该写法 |
| 所有卡片都使用 `backdrop-filter` | 内容对比度下降、低端设备掉帧 | 玻璃仅保留在导航、下拉、Sheet |
| 根字号 15px 但 token 用 rem | 实际正文 14px，整体偏小 | 根字号 16px，正文 15px；UCI 默认同步 |
| `button.cbi-button` 基础规则特异度高于变体 | 主按钮显示灰色/绿色 | 基础选择器降为 `.cbi-button, .btn`，并补 page-actions 覆盖 |
| Bootstrap `body { display:flex }` | 真实 LuCI 中内容宽度异常 | `base.css` 显式 `body { display:block }` |
| 有二级菜单时隐藏 `#echo-header` | 绝大多数页面没有标题 | 移除隐藏规则，标题始终显示 |
| 移动端表格无 `data-label` | 640px 以下表格只剩值 | 所有动态/静态表格补标签 |
| 移动端导航压缩后仍溢出 | 页面横向滚动 | ≤980px 切换为 Sheet；宽度测试全部通过 |
| Sheet 的 `hidden` 被 `display:flex` 覆盖 | 生产环境可能默认显示 | 增加 `.echo-sheet[hidden] / .echo-scrim[hidden]` |
| 登录页主题按钮无脚本 | 登录页外观切换无效 | 增加内联主题控制器与初始状态同步 |
| IPK 包含 macOS `._*` AppleDouble | 包体膨胀、解包脏文件 | `COPYFILE_DISABLE=1` + tar exclude |
| 旧版 Lua 模板仍加载已删除的 `dark.css` | LEDE 构建报错/样式错乱 | 2.0 移除 `luasrc/`，文档明确不支持 |
| 移动端 Sheet 打开时背景仍可聚焦 | 屏幕阅读器/键盘穿透 | `#echo-app.inert = true`，关闭时恢复 |
| 仪表盘注入到安全警告之前 | 未设密码 / initramfs 警告被埋到首屏下方 | 注入点改为最后一个 `.alert-message` 之后 |
| `ui-echo.js` 重复包裹仪表盘表格 | 卡片内再套一层边框，移动端重排失效 | 跳过 `.echo-data-table` / `.echo-panel` 内表格 |
| UCI defaults 文件权限 644 | 首次安装可能不执行主题注册 | 源文件与构建产物统一 `chmod 755` |

---

## 3. 安全

- 动态数据通过 `E()` 文本节点写入，未拼接 HTML；`innerHTML` 仅用于静态图标字符串。
- 主题配置只写入 CSS 变量与文本，不执行用户输入。
- `sysauth.ut` 中密码显示/隐藏仅切换 `type`，不改变提交字段。
- 未引入外部字体、CDN、跟踪脚本；所有资源本地打包。
- `localStorage` 仅保存 `echo-theme`，无敏感信息。
- `ipkg/postinst` 与 UCI defaults 使用固定路径，无外部下载。

**剩余风险**：若第三方插件把未转义内容注入 `ui-echo.js` 处理的 DOM，主题不负责该插件的 XSS；主题不扩大攻击面。

---

## 4. 无障碍

已检查：

- [x] 跳过导航链接
- [x] 全局 `:focus-visible` 2px 外环
- [x] 导航下拉：Enter/Space、上下键、Home/End、Escape
- [x] Sheet：`role=dialog`、`aria-modal`、焦点陷阱、Escape、焦点归还、背景 inert
- [x] 图标按钮全部有 `aria-label`
- [x] 主题三段控件 `aria-pressed`
- [x] 表格 `caption` + `th scope`
- [x] 状态不只靠颜色（文字 + 圆点）
- [x] 320px / 200% 缩放可用
- [x] `prefers-reduced-motion`
- [x] `prefers-reduced-transparency`
- [x] `prefers-contrast: more` 基础覆盖
- [x] 正文对比度 ≥ 4.5:1（浅/深均实测）
- [x] 移动触控目标 ≥ 44px

**未验证**：VoiceOver / NVDA 实机朗读顺序；Safari 的 `inert` 与 `backdrop-filter` 表现。

---

## 5. 性能

- 无 WebGPU / 无 JS 着色器；玻璃为 CSS `backdrop-filter`，只在 3 类固定元素上使用。
- 无外部字体请求；图标为 SVG，菜单图标使用 mask，颜色随主题。
- 页面动画只改变 `opacity` / `transform`；进度条宽度动画在数据更新时触发。
- `dashboard-echo.js` 轮询 10s；请求失败保留旧值。
- 自定义背景图片由用户提供，主题只加遮罩，不预加载额外资源。
- 首屏 CSS 约 50KB 未压缩；IPK 48KB。可通过固件的 CSS tidy 进一步压缩。

**风险**：低端 MIPS 路由器上，`backdrop-filter` 仍可能带来合成开销；`prefers-reduced-transparency` 与无 `backdrop-filter` 浏览器自动回退实色。

---

## 6. 兼容性

| 项 | 状态 |
|----|------|
| OpenWrt 23.05 / 24.10 ucode 模板 | 结构对齐，未实机 |
| ImmortalWrt | 同 ucode，未实机 |
| Bootstrap cascade.css | 已用真实 `cascade.css` 做本地集成页验证 |
| 第三方 LuCI app | `ui-echo.js` 自动包裹表格、Tab、Modal、iframe |
| LEDE 18.06 / Lua | 2.0 移除 |
| Safari | 未实机；依赖 `-webkit-backdrop-filter` 前缀 |
| Firefox | 未实机；`backdrop-filter` 支持，`corner-shape` 自动忽略 |

---

## 7. 测试记录

```text
$ ./scripts/build-ipk.sh
Built: dist/luci-theme-echo_2.0.0-1_all.ipk (48K)
Built: dist/luci-app-echo-config_2.0.0-1_all.ipk (8.0K)

$ ./scripts/verify-ipk.sh
OK: luci-theme-echo_2.0.0-1_all
OK: luci-app-echo-config_2.0.0-1_all
All checks passed for v2.0.0

$ python tests/ui-smoke.py --channel chrome
PASS — 8 widths, desktop, mobile sheet, sign-in, settings
```

覆盖宽度：320 / 360 / 390 / 768 / 980 / 1024 / 1280 / 1440。
检查项：横向溢出、页面异常、下拉、主题三态、Sheet 开关与焦点、登录主按钮颜色、截图。

---

## 8. 后续建议

1. 在真实 OpenWrt 23.05 / 24.10 上跑一次 `uhttpd` + LuCI，验证 `dispatcher.build_url` 与 `inert`。
2. 用 `luci-app-*` 组合（Docker、OpenClash、AdGuard Home、Statistics）做页面级回归。
3. 为 `ui-echo.js` 增加对 `.cbi-section > h3` 重复标题的隐藏规则。
4. 增加 Firefox / Safari 的 Playwright 项目。
5. 若固件空间允许，加入 CSS 压缩步骤（csstidy / lightningcss），目标 < 30KB。
