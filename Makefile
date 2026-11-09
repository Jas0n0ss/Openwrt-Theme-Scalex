#
# Copyright (C) 2025-2026 luci-theme-echo contributors
# Licensed under the Apache License, Version 2.0
#

include $(TOPDIR)/rules.mk

LUCI_TITLE:=Echo 2.0 - Apple-inspired Liquid Glass theme for LuCI
LUCI_DEPENDS:=+luci-theme-bootstrap
PKG_VERSION:=$(shell cat $(CURDIR)/ucode/template/themes/echo/version 2>/dev/null | tr -d '[:space:]' || echo 1.0.0)
PKG_RELEASE:=1

CONFIG_LUCI_CSSTIDY:=

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature

define Package/luci-theme-echo/conffiles
/etc/config/echo
endef

define Package/luci-theme-echo/postrm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	uci -q delete luci.themes.Echo
	uci commit luci
}
endef
