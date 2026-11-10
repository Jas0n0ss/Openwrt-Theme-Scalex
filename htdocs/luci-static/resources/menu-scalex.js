'use strict';
'require baseclass';
'require ui';
'require menu-bootstrap-core as ScaleXMenu';

/*
 * ScaleX 2.1 navigation.
 *
 * Desktop: centered glass pills with L2 dropdowns.
 * Mobile:  a native-feeling sheet built from the same menu tree.
 * Menu ordering, URLs and active-state rules still come from
 * menu-bootstrap-core.js so third-party LuCI apps behave exactly as before.
 */
return baseclass.extend({
	__init__: function() {
		this._overflowBound = false;
		this._dropdownBound = false;
		this._sheetBound = false;
		this._sheet = null;
		this._sheetCloseTimer = null;

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

	_buildTopEntries: function(topChildren) {
		return ScaleXMenu.sortTopChildren(topChildren.filter(function(node) {
			return node.name !== 'logout';
		}));
	},

	_menuRoot: function(tree) {
		var children = ui.menu.getChildren(tree);
		if (children.length === 1 && children[0].name === 'admin')
			return children[0];
		return tree;
	},

	render: function(tree) {
		var topNav = document.getElementById('top-nav');
		if (!topNav) return;

		topNav.innerHTML = '';

		var moreMenu = document.getElementById('top-nav-more-menu');
		if (moreMenu) moreMenu.innerHTML = '';

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

		var self = this;
		var entries = this._buildTopEntries(topChildren);
		var activeEntry = null;

		entries.forEach(function(entry) {
			var section = self.renderTopItem(entry);
			topNav.appendChild(section);
			if (section.classList.contains('is-active'))
				activeEntry = entry;
		});

		topNav.appendChild(this.renderLogoutItem());

		document.querySelectorAll('#scalex-nav-bar .nav-section.has-dropdown .nav-dropdown').forEach(function(panel) {
			panel.setAttribute('hidden', '');
			panel.setAttribute('aria-hidden', 'true');
		});

		if (activeEntry && this._getSubItems(activeEntry).length > 0)
			document.body.classList.add('has-sub-nav');

		this._closeAllDropdowns();
		this._bindDropdowns();
		document.body.dataset.page = L.env.requestpath.join('-') || 'home';
		this._renderTitle(tree);
		this._renderContentTabs(tree);
		this.renderSheet();

		this._syncNavLayout();
		requestAnimationFrame(L.bind(function() {
			this._syncNavLayout();
		}, this));

		if (!this._overflowBound) {
			this._overflowBound = true;
			var syncNav = L.bind(this._syncNavLayout, this);
			window.addEventListener('resize', syncNav);
			if (typeof ResizeObserver !== 'undefined') {
				var row = document.querySelector('.nav-bar-row');
				if (row)
					new ResizeObserver(syncNav).observe(row);
			}
			this._bindMoreMenu();
		}
	},

	_getSubItems: function(entry) {
		var self = this;
		var items = [];

		if (!entry || !entry.node) return items;

		var l2Children = ui.menu.getChildren(entry.node);
		if (l2Children.length === 0) return items;

		l2Children.forEach(function(l2) {
			items.push(self._makeL2Item(l2, entry.node));
		});

		return items;
	},

	_makeL2Item: function(l2, topNode) {
		var idx = (L.env.dispatchpath[0] === 'admin') ? 2 : 1;
		return {
			node: l2,
			active: L.env.dispatchpath[idx] === l2.name,
			url: ScaleXMenu.l2ItemHref(topNode, l2)
		};
	},

	_navCaret: function() {
		return E('span', { 'class': 'nav-caret', 'aria-hidden': 'true' }, [
			E('svg', {
				'viewBox': '0 0 24 24',
				'fill': 'none',
				'stroke': 'currentColor',
				'stroke-width': '2',
				'width': '11',
				'height': '11'
			}, [
				E('path', { 'd': 'M6 9l6 6 6-6' })
			])
		]);
	},

	renderTopItem: function(entry) {
		var topNode = entry.node;
		var isTopActive = ScaleXMenu.isModeActive(topNode, entry.index);
		var label = topNode.title;
		var iconName = topNode.name;
		var subItems = this._getSubItems(entry);
		var topHref = ScaleXMenu.topLevelHref(topNode);
		var menuId = 'scalex-nav-menu-' + (topNode.name || entry.index);
		var sectionChildren;

		sectionChildren = [
			E('a', {
				'class': 'nav-top' +
					(isTopActive ? ' active' : '') +
					(subItems.length > 0 ? ' nav-top-trigger' : '') +
					(topNode.readonly ? ' readonly' : ''),
				'href': topHref,
				'data-name': topNode.name,
				'title': _(label),
				'aria-haspopup': subItems.length ? 'true' : null,
				'aria-expanded': subItems.length ? 'false' : null,
				'aria-controls': subItems.length ? menuId : null
			}, [
				this.getIcon(iconName, label),
				E('span', { 'class': 'nav-label' }, [ _(label) ]),
				subItems.length ? this._navCaret() : ''
			])
		];

		if (subItems.length > 0) {
			sectionChildren.push(E('div', {
				'class': 'nav-dropdown',
				'id': menuId,
				'hidden': '',
				'aria-hidden': 'true',
				'aria-label': _(label)
			},
				subItems.map(L.bind(function(item) {
					return E('a', {
						'class': 'nav-dropdown-item' + (item.active ? ' active' : '') +
							(item.node.readonly ? ' readonly' : ''),
						'href': item.url
					}, [ E('span', { 'class': 'nav-label' }, [ _(item.node.title) ]) ]);
				}, this))
			));
		}

		return E('div', {
			'class': 'nav-section' +
				(isTopActive ? ' is-active' : '') +
				(subItems.length > 0 ? ' has-dropdown' : ''),
			'data-nav-item': '1'
		}, sectionChildren);
	},

	renderLogoutItem: function() {
		var logoutUrl = (L.env.requestpath[0] === 'admin')
			? L.url('admin', 'logout')
			: L.url('logout');

		return E('div', { 'class': 'nav-section nav-logout' }, [
			E('a', {
				'class': 'nav-top nav-logout-link',
				'href': logoutUrl,
				'title': _('Logout')
			}, [
				this.getIcon('logout', _('Logout')),
				E('span', { 'class': 'nav-label' }, [ _('Logout') ])
			])
		]);
	},

	_bindDropdowns: function() {
		var navBar = document.getElementById('scalex-nav-bar');
		if (!navBar || this._dropdownBound) return;

		var self = this;
		this._dropdownBound = true;

		navBar.addEventListener('click', function(e) {
			var section = e.target.closest('.nav-section.has-dropdown');
			if (!section) return;

			if (e.target.closest('.nav-dropdown-item'))
				return;

			var btn = section.querySelector('.nav-top');
			if (!btn || e.target.closest('.nav-top') !== btn)
				return;

			e.preventDefault();
			e.stopPropagation();

			var open = !section.classList.contains('open');
			self._closeAllDropdowns();

			if (open) {
				section.classList.add('open');
				btn.setAttribute('aria-expanded', 'true');
				self._setDropdownOpen(section, true);

				if (e.detail === 0) {
					var first = section.querySelector('.nav-dropdown-item');
					if (first) first.focus();
				}
			}
		});

		navBar.addEventListener('keydown', function(e) {
			var trigger = e.target.closest('.nav-top');
			var section = trigger ? trigger.closest('.nav-section.has-dropdown') : null;

			if (e.key === 'Escape') {
				var openItem = section && section.querySelector('.nav-dropdown-item:focus');
				self._closeAllDropdowns();
				if (trigger) trigger.focus();
				else if (openItem) openItem.blur();
				return;
			}

			if (!section) return;

			var items = Array.prototype.slice.call(section.querySelectorAll('.nav-dropdown-item'));
			if (!items.length) return;

			if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
				e.preventDefault();
				if (!section.classList.contains('open')) {
					self._closeAllDropdowns();
					section.classList.add('open');
					trigger.setAttribute('aria-expanded', 'true');
					self._setDropdownOpen(section, true);
					items[e.key === 'ArrowDown' ? 0 : items.length - 1].focus();
					return;
				}

				var idx = items.indexOf(document.activeElement);
				if (idx < 0) {
					items[0].focus();
					return;
				}

				var next = e.key === 'ArrowDown' ? idx + 1 : idx - 1;
				if (next < 0) next = items.length - 1;
				if (next >= items.length) next = 0;
				items[next].focus();
			}
			else if (e.key === 'Home' && section.classList.contains('open')) {
				e.preventDefault();
				items[0].focus();
			}
			else if (e.key === 'End' && section.classList.contains('open')) {
				e.preventDefault();
				items[items.length - 1].focus();
			}
		});

		document.addEventListener('click', function(e) {
			if (e.target.closest('.nav-section.has-dropdown > .nav-top'))
				return;
			self._closeAllDropdowns();
		});
	},

	_setDropdownOpen: function(section, open) {
		var panel = section && section.querySelector('.nav-dropdown');
		if (!panel) return;

		if (open) {
			panel.removeAttribute('hidden');
			panel.setAttribute('aria-hidden', 'false');
		} else {
			panel.setAttribute('hidden', '');
			panel.setAttribute('aria-hidden', 'true');
		}
	},

	_closeAllDropdowns: function() {
		var self = this;
		document.querySelectorAll('.nav-section.has-dropdown').forEach(function(s) {
			s.classList.remove('open');
			var b = s.querySelector('.nav-top');
			if (b) b.setAttribute('aria-expanded', 'false');
			self._setDropdownOpen(s, false);
		});
	},

	_syncNavLayout: function() {
		var row = document.querySelector('.nav-bar-row');
		var brand = document.querySelector('.header-brand');
		var actions = document.querySelector('.header-actions');
		var wrap = document.querySelector('.top-nav-wrap');
		var nav = document.getElementById('top-nav');
		var moreWrap = document.getElementById('top-nav-more');
		var moreMenu = document.getElementById('top-nav-more-menu');
		var navBar = document.getElementById('scalex-nav-bar');
		if (!row || !wrap || !nav || !moreWrap || !moreMenu || !navBar)
			return;

		navBar.classList.remove('nav-compact');

		var logout = document.querySelector('.nav-section.nav-logout');
		Array.prototype.slice.call(moreMenu.querySelectorAll('[data-nav-item]')).forEach(function(el) {
			if (logout) nav.insertBefore(el, logout);
			else nav.appendChild(el);
		});
		moreMenu.innerHTML = '';
		moreWrap.hidden = true;
		moreWrap.classList.remove('open');

		var moreBtn = document.getElementById('top-nav-more-btn');
		if (moreBtn)
			moreBtn.setAttribute('aria-expanded', 'false');

		if (window.matchMedia && window.matchMedia('(max-width: 980px)').matches)
			return;

		var sections = Array.prototype.slice.call(nav.querySelectorAll('[data-nav-item]'));
		if (sections.length === 0)
			return;

		/* The sheet owns mobile navigation; only measure the desktop row. */
		var available = row.clientWidth -
			(brand ? brand.offsetWidth : 0) -
			(actions ? actions.offsetWidth : 0) -
			28;

		if (available <= 0)
			return;

		function moreWidth() {
			return moreWrap.hidden ? 0 : ((moreBtn ? moreBtn.offsetWidth : 0) + 4);
		}

		function overflows() {
			return nav.scrollWidth > Math.max(0, available - moreWidth());
		}

		if (overflows())
			navBar.classList.add('nav-compact');

		while (sections.length > 1 && overflows()) {
			var last = sections.pop();
			moreMenu.insertBefore(last, moreMenu.firstChild);
			moreWrap.hidden = false;
		}

		if (navBar.classList.contains('nav-compact') && moreWrap.hidden && overflows()) {
			var extra = sections.pop();
			if (extra) {
				moreMenu.insertBefore(extra, moreMenu.firstChild);
				moreWrap.hidden = false;
			}
		}
	},

	_syncNavCenter: function() {
		this._syncNavLayout();
	},

	_syncNavOverflow: function() {
		this._syncNavLayout();
	},

	_bindMoreMenu: function() {
		var moreWrap = document.getElementById('top-nav-more');
		var btn = document.getElementById('top-nav-more-btn');
		if (!moreWrap || !btn) return;

		btn.addEventListener('click', function(e) {
			e.stopPropagation();
			var open = moreWrap.classList.toggle('open');
			btn.setAttribute('aria-expanded', open ? 'true' : 'false');
			var menu = document.getElementById('top-nav-more-menu');
			if (menu) menu.hidden = !open;
		});

		document.addEventListener('click', function(e) {
			if (e.target.closest('#top-nav-more'))
				return;
			moreWrap.classList.remove('open');
			btn.setAttribute('aria-expanded', 'false');
			var menu = document.getElementById('top-nav-more-menu');
			if (menu) menu.hidden = true;
		});

		document.addEventListener('keydown', function(e) {
			if (e.key !== 'Escape')
				return;
			moreWrap.classList.remove('open');
			btn.setAttribute('aria-expanded', 'false');
			var menu = document.getElementById('top-nav-more-menu');
			if (menu) menu.hidden = true;
		});
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

			if (e.key !== 'Tab')
				return;

			var focusable = refs.sheet.querySelectorAll('a[href], button:not([disabled]), summary, [tabindex]:not([tabindex="-1"])');
			if (!focusable.length) return;

			var first = focusable[0];
			var last = focusable[focusable.length - 1];

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

		Array.prototype.forEach.call(topNav.querySelectorAll('[data-nav-item]'), function(section) {
			var top = section.querySelector('.nav-top');
			var label = section.querySelector('.nav-label');
			var icon = section.querySelector('.nav-icon');
			var subLinks = section.querySelectorAll('.nav-dropdown-item');
			var isActive = section.classList.contains('is-active');
			var title = label ? label.textContent.trim() : '';
			var href = top ? top.getAttribute('href') : '#';
			var iconClone = icon ? icon.cloneNode(true) : null;
			var rowChildren = [];

			if (iconClone) {
				if (!iconClone.classList.contains('nav-icon-letter'))
					iconClone.classList.add('nav-icon-mask');
				rowChildren.push(iconClone);
			}
			rowChildren.push(E('span', { 'class': 'nav-label' }, [ title ]));

			if (subLinks.length > 0) {
				rowChildren.push(E('span', {
					'class': 'nav-caret',
					'aria-hidden': 'true'
				}, [ E('span', { 'class': 'scalex-symbol scalex-symbol-chevron' }) ]));

				var subChildren = Array.prototype.map.call(subLinks, function(link) {
					return E('a', {
						'href': link.getAttribute('href'),
						'class': link.classList.contains('active') ? 'is-active' : ''
					}, [ link.textContent.trim() ]);
				});

				var details = E('details', {
					'class': 'scalex-sheet-group' + (isActive ? ' is-active' : '')
				}, [
					E('summary', {
						'class': 'scalex-sheet-row' + (isActive ? ' is-active' : '')
					}, rowChildren),
					E('div', { 'class': 'scalex-sheet-sub' }, subChildren)
				]);

				if (isActive)
					details.setAttribute('open', '');
				nav.appendChild(details);
			}
			else {
				nav.appendChild(E('a', {
					'href': href,
					'class': 'scalex-sheet-row' + (isActive ? ' is-active' : '')
				}, rowChildren));
			}
		});

		footer.appendChild(E('a', {
			'href': L.url('logout'),
			'class': 'scalex-sheet-logout'
		}, [
			this.getIcon('logout', _('Logout')),
			E('span', {}, [ _('Logout') ])
		]));
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
		if (menuBtn)
			menuBtn.setAttribute('aria-expanded', 'true');

		var closeBtn = refs.sheet.querySelector('#scalex-sheet-close');
		if (closeBtn)
			closeBtn.focus();
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
		if (menuBtn)
			menuBtn.setAttribute('aria-expanded', 'false');

		var self = this;
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
		if (crumbEl)
			crumbEl.textContent = parts.length > 1 ? parts.slice(0, -1).join(' › ') : '';
	},

	_renderContentTabs: function(tree) {
		if (!ScaleXMenu.shouldRenderContentTabs()) return;

		var root = ScaleXMenu.resolveTabRoot(tree);
		if (root) this.renderTabMenu(root.node, root.url, 0, 3);
	},

	/* Same depth/path rules as menu-bootstrap.js renderTabMenu */
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
			var className = 'content-tab tabmenu-item-' + child.name + (isActive ? ' active' : '');

			container.appendChild(E('a', {
				'class': className,
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
