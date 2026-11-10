# ScaleX Theme — Menu Icons

Icons for the top navigation bar.

## Sources

| File | Source |
|------|--------|
| `system.svg`, `wireless.svg` | [OpenWrt LuCI Dashboard](https://github.com/openwrt/luci/tree/master/modules/luci-mod-dashboard/htdocs/luci-static/resources/view/dashboard/icons) (LuCI/GPL) |
| Other `*.svg` | [Material Design Icons](https://pictogrammers.com/library/mdi/) (Apache 2.0), same family used by OpenWrt `luci-base` icon refresh |

## Refresh upstream OpenWrt dashboard icons

```bash
./scripts/fetch-menu-icons.sh
```

## License

- MDI icons: Apache License 2.0
- OpenWrt dashboard icons: follow LuCI / OpenWrt license terms
