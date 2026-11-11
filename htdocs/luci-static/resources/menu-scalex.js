'use strict';
'require baseclass';
'require ui';
'require menu-bootstrap-core as ScaleXMenu';

/*
 * ScaleX 5.0 navigation — Apple.com-style horizontal top bar.
 *
 * L1 lives in the top bar. Items with children open a glass L2 menu on
 * hover, focus or touch. Phones use the same tree in a bottom sheet.
 */
return baseclass.extend({
	__init__: function() {
		this._sheet = null;
		this._sheetBound = false;
		this._sheetCloseTimer = null;
		this._outsideBound = false;

		ui.menu.load().then(L.bind(this.render, this));

		document.addEventListener('visibilitychange', L.bind(function() {
			if (!document.hidden)
				ui.menu.load().then(L.bind(this.render, this));
		}, this));
	},

	_iconBase: null,
	_iconKeys: null,

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
		var items = [];
		if (!entry || !entry.node) return items;

		var idx = (L.env.dispatchpath[0] === 'admin') ? 2 : 1;
		ui.menu.getChildren(entry.node).forEach(function(child) {
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

		entries.forEach(L.bind(function(entry) {
			var section = this.renderTopItem(entry);
			topNav.appendChild(section);
			if (section.classList.contains('is-active'))
				activeEntry = entry;
		}, this));

		var actions = document.getElementById('scalex-topbar-actions');
		if (actions) {
			actions.innerHTML = '';
			actions.appendChild(this.renderLogoutItem());
		}

		if (activeEntry && this._getSubItems(activeEntry).length > 0)
			document.body.classList.add('has-sub-nav');

		document.body.dataset.page = L.env.requestpath.join('-') || 'home';
		this._renderTitle(tree);
		this._renderContentTabs(tree);
		this.renderMobileTabs(activeEntry);
		this.renderSheet();
		this._bindOutside();
	},

	renderTopItem: function(entry) {
		var topNode = entry.node;
		var subItems = this._getSubItems(entry);
		var isActive = ScaleXMenu.isModeActive(topNode, entry.index);
		var href = subItems.length ? subItems[0].url : ScaleXMenu.topLevelHref(topNode);
		var link = E('a', {
			'class': 'top-nav-link',
			'href': href,
			'aria-current': (isActive && subItems.length === 0) ? 'page' : null,
			'aria-haspopup': subItems.length ? 'true' : null,
			'aria-expanded': subItems.length ? 'false' : null
		}, [ _(topNode.title) ]);

		var section = E('div', {
			'class': 'top-nav-section' + (isActive ? ' is-active' : '')
		}, [ link ]);

		if (subItems.length) {
			var menu = E('div', { 'class': 'top-nav-menu' }, subItems.map(function(item) {
				return E('a', {
					'href': item.url,
					'class': item.active ? 'active' : '',
					'aria-current': item.active ? 'page' : null
				}, [ _(item.node.title) ]);
			}));
			section.appendChild(menu);

			var open = function() {
				section.classList.add('open');
				link.setAttribute('aria-expanded', 'true');
				menu.querySelectorAll('a').forEach(function(a) { a.tabIndex = 0; });
			};
			var close = function() {
				section.classList.remove('open');
				link.setAttribute('aria-expanded', 'false');
			};

			section.addEventListener('mouseenter', open);
			section.addEventListener('mouseleave', close);
			section.addEventListener('focusin', open);
			section.addEventListener('focusout', function(e) {
				if (!section.contains(e.relatedTarget)) close();
			});
			link.addEventListener('keydown', function(e) {
				if (e.key === 'Escape') {
					close();
					link.focus();
				}
				if (e.key === 'ArrowDown') {
					e.preventDefault();
					open();
					var first = menu.querySelector('a');
					if (first) first.focus();
				}
			});
			menu.addEventListener('keydown', function(e) {
				if (e.key === 'Escape') {
					close();
					link.focus();
				}
			});
		}

		return section;
	},

	renderLogoutItem: function() {
		var url = (L.env.requestpath[0] === 'admin')
			? L.url('admin', 'logout')
			: L.url('logout');

		return E('a', {
			'class': 'topbar-logout',
			'href': url,
			'title': _('Logout')
		}, [
			this.getIcon('logout', _('Logout')),
			E('span', { 'class': 'nav-label' }, [ _('Logout') ])
		]);
	},

	_bindOutside: function() {
		if (this._outsideBound) return;
		this._outsideBound = true;

		document.addEventListener('click', function(e) {
			if (e.target.closest && e.target.closest('.top-nav-section')) return;
			document.querySelectorAll('.top-nav-section.open').forEach(function(section) {
				section.classList.remove('open');
				var link = section.querySelector('.top-nav-link');
				if (link) link.setAttribute('aria-expanded', 'false');
			});
		});
	},

	/* ── Phone L2 segmented control ──────────────────────────────────── */

	renderMobileTabs: function(activeEntry) {
		var container = document.getElementById('scalex-mobile-tabs');
		if (!container) return;

		container.innerHTML = '';
		var subItems = this._getSubItems(activeEntry);
		if (!subItems.length) {
			container.hidden = true;
			return;
		}

		container.hidden = false;
		container.setAttribute('role', 'tablist');
		subItems.forEach(function(item) {
			container.appendChild(E('a', {
				'class': 'mobile-tab' + (item.active ? ' active' : ''),
				'href': item.url,
				'role': 'tab',
				'aria-selected': item.active ? 'true' : 'false'
			}, [ _(item.node.title) ]));
		});
	},

	/* ── Mobile sheet ────────────────────────────────────────────────── */

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

		Array.prototype.forEach.call(topNav.querySelectorAll('.top-nav-section'), function(section) {
			var link = section.querySelector('.top-nav-link');
			if (!link) return;

			var title = link.textContent.trim();
			var href = link.getAttribute('href') || '#';
			var subLinks = section.querySelectorAll('.top-nav-menu a');
			var active = section.classList.contains('is-active');
			var children = [ E('span', { 'class': 'nav-label' }, [ title ]) ];

			if (subLinks.length > 0) {
				var details = E('details', {
					'class': 'scalex-sheet-section' + (active ? ' is-active' : '')
				}, [
					E('summary', { 'class': 'scalex-sheet-row' + (active ? ' is-active' : '') }, children),
					E('div', { 'class': 'scalex-sheet-sub' }, Array.prototype.map.call(subLinks, function(a) {
						return E('a', {
							'href': a.getAttribute('href'),
							'class': a.classList.contains('active') ? 'is-active' : '',
							'aria-current': a.classList.contains('active') ? 'page' : null
						}, [ a.textContent.trim() ]);
					}))
				]);
				if (active) details.setAttribute('open', '');
				nav.appendChild(details);
			} else {
				nav.appendChild(E('a', {
					'href': href,
					'class': 'scalex-sheet-row' + (active ? ' is-active' : '')
				}, children));
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

		for (var i = 0; i < L.env.dispatchpath.length && node; i++) {
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
