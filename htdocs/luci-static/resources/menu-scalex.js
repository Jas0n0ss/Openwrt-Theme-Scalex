'use strict';
'require baseclass';
'require ui';
'require menu-bootstrap-core as ScaleXMenu';

/*
 * ScaleX 3.0 navigation — macOS Settings-style sidebar.
 *
 * The sidebar is server-independent: LuCI's menu tree is normalized (the
 * 24.10 tree is rooted at "admin"), L1 sections are rows, and only the active
 * section reveals its L2 pages. The same tree feeds the mobile sheet.
 */
return baseclass.extend({
	__init__: function() {
		this._sheet = null;
		this._sheetBound = false;
		this._sheetCloseTimer = null;

		this._bindSearch();
		ui.menu.load().then(L.bind(this.render, this));

		document.addEventListener('visibilitychange', L.bind(function() {
			if (!document.hidden)
				ui.menu.load().then(L.bind(this.render, this));
		}, this));
	},

	_iconBase: null,
	_iconKeys: null,

	_bindSearch: function() {
		var input = document.getElementById('scalex-nav-search');
		if (!input) return;

		input.addEventListener('input', L.bind(this._filterNav, this));
		input.addEventListener('keydown', function(e) {
			if (e.key === 'Escape') {
				input.value = '';
				input.dispatchEvent(new Event('input'));
				input.blur();
			}
		});
	},

	_filterNav: function() {
		var input = document.getElementById('scalex-nav-search');
		var query = input ? input.value.trim().toLowerCase() : '';
		var topNav = document.getElementById('top-nav');
		if (!topNav) return;

		Array.prototype.forEach.call(topNav.querySelectorAll('.sidebar-section'), function(section) {
			var match = !query || section.textContent.toLowerCase().indexOf(query) >= 0;
			section.hidden = !match;
			section.classList.toggle('is-search', !!query && match);
		});

		if (this._sheet) this.renderSheet();
	},

	iconFiles: {
		'status': 'status.svg',
		'network': 'network.svg',
		'system': 'system.svg',
		'admin': 'system.svg',
		'services': 'services.svg',
		'wireless': 'wireless.svg',
		'wifi': 'wireless.svg',
		'firewall': 'firewall.svg',
		'vpn': 'vpn.svg',
		'software': 'store.svg',
		'openvpn': 'vpn.svg',
		'wireguard': 'vpn.svg',
		'docker': 'docker.svg',
		'passwall': 'proxy.svg',
		'openclash': 'proxy.svg',
		'homeproxy': 'proxy.svg',
		'shadowsocks': 'proxy.svg',
		'v2ray': 'proxy.svg',
		'ssr': 'proxy.svg',
		'mosdns': 'dns.svg',
		'smartdns': 'dns.svg',
		'adguard': 'firewall.svg',
		'adguardhome': 'firewall.svg',
		'banip': 'firewall.svg',
		'nas': 'storage.svg',
		'samba': 'storage.svg',
		'filebrowser': 'storage.svg',
		'diskman': 'storage.svg',
		'statistics': 'statistics.svg',
		'nlbwmon': 'statistics.svg',
		'netdata': 'statistics.svg',
		'ddns': 'dns.svg',
		'upnp': 'services.svg',
		'transmission': 'download.svg',
		'aria2': 'download.svg',
		'ttyd': 'terminal.svg',
		'istore': 'store.svg',
		'store': 'store.svg',
		'acme': 'vpn.svg',
		'frpc': 'proxy.svg',
		'frps': 'proxy.svg',
		'turboacc': 'proxy.svg',
		'watchcat': 'status.svg',
		'clients': 'clients.svg',
		'logout': 'logout.svg',
		'_default': 'default.svg'
	},

	_getIconBase: function() {
		if (this._iconBase) return this._iconBase;

		var link = document.querySelector('link[href*="/luci-static/scalex/"]');
		if (link) {
			var href = link.getAttribute('href') || '';
			var m = href.match(/^(.*\/luci-static\/scalex\/)/);
			if (m) {
				this._iconBase = m[1] + 'icons/menu/';
				return this._iconBase;
			}
		}

		this._iconBase = '/luci-static/scalex/icons/menu/';
		return this._iconBase;
	},

	_getIconKeys: function() {
		if (!this._iconKeys) {
			this._iconKeys = Object.keys(this.iconFiles)
				.filter(function(k) { return k !== '_default'; })
				.sort(function(a, b) { return b.length - a.length; });
		}
		return this._iconKeys;
	},

	_iconKey: function(name) {
		if (!name) return '_default';
		if (this.iconFiles[name]) return name;
		var lower = (name + '').toLowerCase();
		var keys = this._getIconKeys();
		for (var i = 0; i < keys.length; i++) {
			if (lower.indexOf(keys[i]) >= 0)
				return keys[i];
		}
		return '_default';
	},

	getIcon: function(name, title) {
		var key = this._iconKey(name);
		var file = this.iconFiles[key] || this.iconFiles._default;
		var url = this._getIconBase() + file;

		if (key === '_default' && title) {
			var letter = (title + '').trim().charAt(0).toUpperCase() || '?';
			return E('span', { 'class': 'nav-icon nav-icon-letter', 'aria-hidden': 'true' }, [ letter ]);
		}

		return E('span', {
			'class': 'nav-icon nav-icon-mask',
			'style': '-webkit-mask-image:url("' + url + '");mask-image:url("' + url + '");',
			'aria-hidden': 'true'
		});
	},

	_menuRoot: function(tree) {
		var children = ui.menu.getChildren(tree);
		if (children.length === 1 && children[0].name === 'admin')
			return children[0];
		return tree;
	},

	_getSubItems: function(entry) {
		var self = this;
		var items = [];
		if (!entry || !entry.node) return items;

		var children = ui.menu.getChildren(entry.node);
		var idx = (L.env.dispatchpath[0] === 'admin') ? 2 : 1;

		children.forEach(function(child) {
			items.push({
				node: child,
				active: L.env.dispatchpath[idx] === child.name,
				url: ScaleXMenu.l2ItemHref(entry.node, child)
			});
		});

		return items;
	},

	render: function(tree) {
		var topNav = document.getElementById('top-nav');
		if (!topNav) return;

		topNav.innerHTML = '';
		document.body.classList.remove('has-sub-nav');

		var contentTabs = document.getElementById('content-tabs');
		if (contentTabs) {
			delete contentTabs.dataset.scalexAppTabs;
			contentTabs.innerHTML = '';
			contentTabs.classList.remove('active');
		}
		document.body.classList.remove('has-content-tabs');

		var topChildren = ui.menu.getChildren(this._menuRoot(tree));
		if (topChildren.length === 0) return;

		var entries = ScaleXMenu.sortTopChildren(topChildren.filter(function(node) {
			return node.name !== 'logout';
		}));
		var activeEntry = null;

		for (var i = 0; i < entries.length; i++) {
			var section = this.renderSection(entries[i]);
			topNav.appendChild(section);
			if (section.classList.contains('is-active'))
				activeEntry = entries[i];
		}

		var actions = document.getElementById('scalex-sidebar-actions');
		if (actions) {
			actions.innerHTML = '';
			actions.appendChild(this.renderLogoutItem());
		}

		if (activeEntry && this._getSubItems(activeEntry).length > 0)
			document.body.classList.add('has-sub-nav');

		this._filterNav();
		document.body.dataset.page = L.env.requestpath.join('-') || 'home';
		this._renderTitle(tree);
		this._renderContentTabs(tree);
		this.renderSheet();
	},

	renderSection: function(entry) {
		var topNode = entry.node;
		var subItems = this._getSubItems(entry);
		var isActive = ScaleXMenu.isModeActive(topNode, entry.index);
		var href = subItems.length ? subItems[0].url : ScaleXMenu.topLevelHref(topNode);
		var children = [
			E('a', {
				'class': 'sidebar-item' + (isActive ? ' active' : '') + (topNode.readonly ? ' readonly' : ''),
				'href': href,
				'title': _(topNode.title),
				'aria-current': (isActive && subItems.length === 0) ? 'page' : null
			}, [
				this.getIcon(topNode.name, topNode.title),
				E('span', { 'class': 'nav-label' }, [ _(topNode.title) ])
			])
		];

		if (subItems.length > 0) {
			children.push(E('div', { 'class': 'sidebar-sub' },
				subItems.map(function(item) {
					return E('a', {
						'class': 'sidebar-subitem' + (item.active ? ' active' : '') +
							(item.node.readonly ? ' readonly' : ''),
						'href': item.url,
						'aria-current': item.active ? 'page' : null
					}, [ _(item.node.title) ]);
				})
			));
		}

		return E('div', {
			'class': 'sidebar-section' + (isActive ? ' is-active' : '') + (subItems.length ? ' has-sub' : ''),
			'data-nav-item': '1'
		}, children);
	},

	renderLogoutItem: function() {
		var url = (L.env.requestpath[0] === 'admin')
			? L.url('admin', 'logout')
			: L.url('logout');

		return E('a', {
			'class': 'sidebar-logout',
			'href': url,
			'title': _('Logout')
		}, [
			this.getIcon('logout', _('Logout')),
			E('span', { 'class': 'nav-label' }, [ _('Logout') ])
		]);
	},

	/* ── Mobile sheet ─────────────────────────────────────────────────── */

	_ensureSheet: function() {
		if (this._sheet) return this._sheet;

		var scrim = E('div', { 'class': 'scalex-scrim', 'id': 'scalex-scrim', 'hidden': '' });
		var sheet = E('div', {
			'class': 'scalex-sheet',
			'id': 'scalex-sheet',
			'role': 'dialog',
			'aria-modal': 'true',
			'aria-labelledby': 'scalex-sheet-title',
			'hidden': ''
		}, [
			E('div', { 'class': 'scalex-sheet-grabber', 'aria-hidden': 'true' }),
			E('div', { 'class': 'scalex-sheet-head' }, [
				E('h2', { 'class': 'scalex-sheet-title', 'id': 'scalex-sheet-title' }, [ _('Browse') ]),
				E('button', {
					'type': 'button',
					'class': 'scalex-sheet-close',
					'id': 'scalex-sheet-close',
					'aria-label': _('Close menu')
				}, [ E('span', { 'class': 'scalex-symbol scalex-symbol-close', 'aria-hidden': 'true' }) ])
			]),
			E('nav', {
				'class': 'scalex-sheet-nav',
				'id': 'scalex-sheet-nav',
				'aria-label': _('Main navigation')
			}),
			E('div', { 'class': 'scalex-sheet-footer', 'id': 'scalex-sheet-footer' })
		]);

		document.body.appendChild(scrim);
		document.body.appendChild(sheet);
		this._sheet = { scrim: scrim, sheet: sheet };
		this._bindSheet();
		return this._sheet;
	},

	_bindSheet: function() {
		if (this._sheetBound) return;
		this._sheetBound = true;

		var self = this;
		var refs = this._sheet;
		var menuBtn = document.getElementById('scalex-menu-btn');

		if (menuBtn) {
			menuBtn.addEventListener('click', function() {
				if (refs.sheet.classList.contains('is-open'))
					self.closeSheet();
				else
					self.openSheet();
			});
		}

		refs.scrim.addEventListener('click', function() { self.closeSheet(); });

		var closeBtn = refs.sheet.querySelector('#scalex-sheet-close');
		if (closeBtn)
			closeBtn.addEventListener('click', function() { self.closeSheet(); });

		refs.sheet.addEventListener('keydown', function(e) {
			if (e.key === 'Escape') {
				e.preventDefault();
				self.closeSheet();
				return;
			}
			if (e.key !== 'Tab') return;

			var focusable = refs.sheet.querySelectorAll('a[href], button:not([disabled]), summary');
			if (!focusable.length) return;
			var first = focusable[0], last = focusable[focusable.length - 1];

			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		});

		refs.sheet.querySelector('#scalex-sheet-nav').addEventListener('click', function(e) {
			if (e.target.closest('a'))
				self.closeSheet(false);
		});
	},

	renderSheet: function() {
		var refs = this._ensureSheet();
		var nav = refs.sheet.querySelector('#scalex-sheet-nav');
		var footer = refs.sheet.querySelector('#scalex-sheet-footer');
		var topNav = document.getElementById('top-nav');
		if (!nav || !topNav) return;

		nav.innerHTML = '';
		footer.innerHTML = '';

		Array.prototype.forEach.call(topNav.querySelectorAll('.sidebar-section'), function(section) {
			if (section.hidden) return;
			var top = section.querySelector('.sidebar-item');
			var label = section.querySelector('.nav-label');
			if (!top || !label) return;

			var title = label.textContent.trim();
			var href = top.getAttribute('href') || '#';
			var icon = section.querySelector('.nav-icon');
			var subLinks = section.querySelectorAll('.sidebar-subitem');
			var active = section.classList.contains('is-active');
			var rowChildren = [];

			if (icon) rowChildren.push(icon.cloneNode(true));
			rowChildren.push(E('span', { 'class': 'nav-label' }, [ title ]));

			if (subLinks.length > 0) {
				rowChildren.push(E('span', { 'class': 'nav-caret', 'aria-hidden': 'true' }, [
					E('span', { 'class': 'scalex-symbol scalex-symbol-chevron' })
				]));

				var subChildren = Array.prototype.map.call(subLinks, function(link) {
					return E('a', {
						'href': link.getAttribute('href'),
						'class': link.classList.contains('active') ? 'is-active' : '',
						'aria-current': link.classList.contains('active') ? 'page' : null
					}, [ link.textContent.trim() ]);
				});

				var details = E('details', {
					'class': 'scalex-sheet-section' + (active ? ' is-active' : '')
				}, [
					E('summary', { 'class': 'scalex-sheet-row' + (active ? ' is-active' : '') }, rowChildren),
					E('div', { 'class': 'scalex-sheet-sub' }, subChildren)
				]);

				if (active) details.setAttribute('open', '');
				nav.appendChild(details);
			} else {
				nav.appendChild(E('a', {
					'href': href,
					'class': 'scalex-sheet-row' + (active ? ' is-active' : '')
				}, rowChildren));
			}
		});

		footer.appendChild(this.renderLogoutItem());
	},

	openSheet: function() {
		var refs = this._ensureSheet();
		var menuBtn = document.getElementById('scalex-menu-btn');

		this.renderSheet();
		clearTimeout(this._sheetCloseTimer);
		refs.scrim.hidden = false;
		refs.sheet.hidden = false;

		requestAnimationFrame(function() {
			refs.scrim.classList.add('is-visible');
			refs.sheet.classList.add('is-open');
		});

		document.body.classList.add('scalex-sheet-open');
		var app = document.getElementById('scalex-app');
		if (app) app.inert = true;
		if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');

		var closeBtn = refs.sheet.querySelector('#scalex-sheet-close');
		if (closeBtn) closeBtn.focus();
	},

	closeSheet: function(restoreFocus) {
		var refs = this._sheet;
		if (!refs) return;

		refs.sheet.classList.remove('is-open');
		refs.scrim.classList.remove('is-visible');
		document.body.classList.remove('scalex-sheet-open');
		var app = document.getElementById('scalex-app');
		if (app) app.inert = false;

		var menuBtn = document.getElementById('scalex-menu-btn');
		if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');

		this._sheetCloseTimer = setTimeout(function() {
			refs.sheet.hidden = true;
			refs.scrim.hidden = true;
		}, 400);

		if (restoreFocus !== false && menuBtn)
			menuBtn.focus();
	},

	/* ── Titles and section tabs ──────────────────────────────────────── */

	_renderTitle: function(tree) {
		var titleEl = document.getElementById('header-title');
		var crumbEl = document.getElementById('header-breadcrumb');
		if (!titleEl) return;

		var node = tree;
		var parts = [];
		var title = '';
		var i;

		for (i = 0; i < L.env.dispatchpath.length && node; i++) {
			node = node.children[L.env.dispatchpath[i]];
			if (node && node.title) {
				title = node.title;
				parts.push(_(node.title));
			}
		}

		if (!title) {
			title = document.body.dataset.page === 'home' ? _('Overview') : '';
			parts = [];
		}

		titleEl.textContent = title;
		if (crumbEl) {
			var crumbs = parts.slice(0, -1).filter(function(part) {
				return part !== 'Administration' && part !== _('Administration');
			});
			crumbEl.textContent = crumbs.slice(-1).join(' · ');
		}
	},

	_renderContentTabs: function(tree) {
		if (!ScaleXMenu.shouldRenderContentTabs()) return;
		var root = ScaleXMenu.resolveTabRoot(tree);
		if (root) this.renderTabMenu(root.node, root.url, 0, 3);
	},

	renderTabMenu: function(tree, url, level, basePathIdx) {
		var container = document.getElementById('content-tabs');
		var tabHook = document.getElementById('tabmenu');
		if (!container || container.dataset.scalexAppTabs) return;

		var children = ui.menu.getChildren(tree);
		if (children.length === 0) return;

		var pathIdx = (basePathIdx != null ? basePathIdx : 3) + (level || 0);
		var activeNode = null;

		children.forEach(function(child) {
			var isActive = L.env.dispatchpath[pathIdx] === child.name;
			container.appendChild(E('a', {
				'class': 'content-tab tabmenu-item-' + child.name + (isActive ? ' active' : ''),
				'href': L.url(url, child.name)
			}, [ _(child.title) ]));
			if (isActive) activeNode = child;
		});

		container.classList.add('active');
		container.style.display = '';
		document.body.classList.add('has-content-tabs');

		if (tabHook) {
			tabHook.innerHTML = '';
			tabHook.style.display = 'none';
		}

		if (activeNode)
			this.renderTabMenu(activeNode, url + '/' + activeNode.name, (level || 0) + 1, basePathIdx);
	}
});
