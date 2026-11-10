(function () {
	'use strict';

	var THEME_KEY = 'scalex-theme';
	var MODES = ['auto', 'light', 'dark'];
	var params = new URLSearchParams(window.location.search);
	var clean = params.get('clean') === '1';

	if (clean)
		document.body.classList.add('demo-clean-view');

	var views = {
		dashboard: document.getElementById('view-app'),
		settings: document.getElementById('view-settings'),
		login: document.getElementById('view-login')
	};

	function showView(name) {
		Object.keys(views).forEach(function (key) {
			if (views[key])
				views[key].hidden = key !== name;
		});

		document.querySelectorAll('.demo-btn[data-view]').forEach(function (btn) {
			btn.classList.toggle('active', btn.dataset.view === name);
		});

		document.body.classList.toggle('scalex-login', name === 'login');
		window.scrollTo(0, 0);
	}

	document.querySelectorAll('.demo-btn[data-view]').forEach(function (btn) {
		btn.addEventListener('click', function () { showView(btn.dataset.view); });
	});

	/* ── Appearance ─────────────────────────────────────────────────── */

	function systemDark() {
		return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
	}

	function applyTheme(mode) {
		if (MODES.indexOf(mode) < 0) mode = 'auto';
		var dark = mode === 'dark' || (mode === 'auto' && systemDark());

		document.documentElement.dataset.theme = mode;
		document.documentElement.setAttribute('data-darkmode', dark ? 'true' : 'false');

		var meta = document.getElementById('meta-theme-color');
		if (meta) meta.setAttribute('content', dark ? '#000000' : '#f5f5f7');

		document.querySelectorAll('[data-theme-mode]').forEach(function (btn) {
			btn.setAttribute('aria-pressed', btn.getAttribute('data-theme-mode') === mode ? 'true' : 'false');
		});
	}

	function setTheme(mode) {
		try { localStorage.setItem(THEME_KEY, mode); } catch (e) {}
		applyTheme(mode);
	}

	var initialTheme = 'auto';
	try { initialTheme = localStorage.getItem(THEME_KEY) || 'auto'; } catch (e) {}
	applyTheme(initialTheme);

	document.querySelectorAll('[data-theme-mode]').forEach(function (btn) {
		btn.addEventListener('click', function () { setTheme(btn.getAttribute('data-theme-mode')); });
	});

	if (window.matchMedia) {
		var mq = window.matchMedia('(prefers-color-scheme: dark)');
		var onChange = function () {
			var current = 'auto';
			try { current = localStorage.getItem(THEME_KEY) || 'auto'; } catch (e) {}
			if (current === 'auto') applyTheme('auto');
		};
		if (mq.addEventListener) mq.addEventListener('change', onChange);
		else if (mq.addListener) mq.addListener(onChange);
	}

	/* ── Desktop dropdowns ──────────────────────────────────────────── */

	var navBar = document.getElementById('scalex-nav-bar');

	function setDropdown(section, open) {
		section.classList.toggle('open', open);
		var trigger = section.querySelector('.nav-top');
		var panel = section.querySelector('.nav-dropdown');
		if (trigger) trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
		if (!panel) return;
		if (open) {
			panel.removeAttribute('hidden');
			panel.setAttribute('aria-hidden', 'false');
		} else {
			panel.setAttribute('hidden', '');
			panel.setAttribute('aria-hidden', 'true');
		}
	}

	function closeDropdowns(except) {
		document.querySelectorAll('.nav-section.has-dropdown').forEach(function (section) {
			if (section !== except) setDropdown(section, false);
		});
	}

	if (navBar) {
		navBar.addEventListener('click', function (e) {
			var section = e.target.closest('.nav-section.has-dropdown');
			if (!section || e.target.closest('.nav-dropdown-item') || e.target.closest('.nav-logout-link')) return;

			var trigger = section.querySelector('.nav-top');
			if (!trigger || e.target.closest('.nav-top') !== trigger) return;

			e.preventDefault();
			e.stopPropagation();

			var willOpen = !section.classList.contains('open');
			closeDropdowns();
			if (willOpen) {
				setDropdown(section, true);
				if (e.detail === 0) {
					var first = section.querySelector('.nav-dropdown-item');
					if (first) first.focus();
				}
			}
		});

		navBar.addEventListener('keydown', function (e) {
			var trigger = e.target.closest('.nav-top');
			var section = trigger && trigger.closest('.nav-section.has-dropdown');
			var items = section ? Array.prototype.slice.call(section.querySelectorAll('.nav-dropdown-item')) : [];

			if (e.key === 'Escape') {
				closeDropdowns();
				if (trigger) trigger.focus();
				return;
			}

			if (!section || !items.length) return;

			if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
				e.preventDefault();
				if (!section.classList.contains('open')) {
					closeDropdowns();
					setDropdown(section, true);
					items[e.key === 'ArrowDown' ? 0 : items.length - 1].focus();
					return;
				}
				var idx = items.indexOf(document.activeElement);
				var next = e.key === 'ArrowDown' ? idx + 1 : idx - 1;
				if (next < 0) next = items.length - 1;
				if (next >= items.length) next = 0;
				items[next].focus();
			}
		});

		document.addEventListener('click', function (e) {
			if (!e.target.closest('.nav-section.has-dropdown'))
				closeDropdowns();
		});

		document.querySelectorAll('.nav-dropdown-item').forEach(function (link) {
			link.addEventListener('click', function () { closeDropdowns(); });
		});
	}

	/* ── Mobile sheet ───────────────────────────────────────────────── */

	var sheetRefs = null;

	function buildSheet() {
		if (sheetRefs) return sheetRefs;

		var scrim = document.createElement('div');
		scrim.className = 'scalex-scrim';
		scrim.id = 'scalex-scrim';
		scrim.hidden = true;

		var sheet = document.createElement('div');
		sheet.className = 'scalex-sheet';
		sheet.id = 'scalex-sheet';
		sheet.setAttribute('role', 'dialog');
		sheet.setAttribute('aria-modal', 'true');
		sheet.setAttribute('aria-labelledby', 'scalex-sheet-title');
		sheet.hidden = true;
		sheet.innerHTML =
			'<div class="scalex-sheet-grabber" aria-hidden="true"></div>' +
			'<div class="scalex-sheet-head">' +
				'<h2 class="scalex-sheet-title" id="scalex-sheet-title">浏览</h2>' +
				'<button type="button" class="scalex-sheet-close" id="scalex-sheet-close" aria-label="关闭菜单">' +
					'<span class="scalex-symbol scalex-symbol-close" aria-hidden="true"></span>' +
				'</button>' +
			'</div>' +
			'<nav class="scalex-sheet-nav" id="scalex-sheet-nav" aria-label="主导航"></nav>' +
			'<div class="scalex-sheet-footer" id="scalex-sheet-footer"></div>';

		document.body.appendChild(scrim);
		document.body.appendChild(sheet);

		sheetRefs = { scrim: scrim, sheet: sheet, nav: sheet.querySelector('#scalex-sheet-nav') };
		buildSheetNav();

		scrim.addEventListener('click', function () { closeSheet(); });
		sheet.querySelector('#scalex-sheet-close').addEventListener('click', function () { closeSheet(); });
		sheet.querySelector('#scalex-sheet-nav').addEventListener('click', function (e) {
			if (e.target.closest('a')) closeSheet(false);
		});

		sheet.addEventListener('keydown', function (e) {
			if (e.key === 'Escape') {
				e.preventDefault();
				closeSheet();
				return;
			}
			if (e.key !== 'Tab') return;

			var focusable = sheet.querySelectorAll('a[href], button:not([disabled]), summary');
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

		return sheetRefs;
	}

	function buildSheetNav() {
		var refs = buildSheet();
		var nav = refs.nav;
		var footer = document.getElementById('scalex-sheet-footer');
		var topNav = document.getElementById('top-nav');
		if (!nav || !topNav) return;

		nav.innerHTML = '';
		footer.innerHTML = '';

		Array.prototype.forEach.call(topNav.querySelectorAll('.nav-section'), function (section) {
			if (section.classList.contains('nav-logout')) return;
			var trigger = section.querySelector('.nav-top');
			if (!trigger) return;

			var label = section.querySelector('.nav-label');
			if (!label) return;

			var icon = section.querySelector('.nav-icon');
			var title = label.textContent.trim();
			var subLinks = section.querySelectorAll('.nav-dropdown-item');
			var active = section.classList.contains('is-active');
			var rowChildren = [];

			if (icon) rowChildren.push(icon.cloneNode(true));
			rowChildren.push(Object.assign(document.createElement('span'), { className: 'nav-label', textContent: title }));

			if (subLinks.length) {
				var caret = document.createElement('span');
				caret.className = 'nav-caret';
				caret.setAttribute('aria-hidden', 'true');
				caret.innerHTML = '<span class="scalex-symbol scalex-symbol-chevron"></span>';
				rowChildren.push(caret);

				var details = document.createElement('details');
				details.className = 'scalex-sheet-group';
				if (active) details.open = true;

				var summary = document.createElement('summary');
				summary.className = 'scalex-sheet-row' + (active ? ' is-active' : '');
				rowChildren.forEach(function (child) { summary.appendChild(child); });

				var sub = document.createElement('div');
				sub.className = 'scalex-sheet-sub';
				subLinks.forEach(function (link) {
					var a = document.createElement('a');
					a.href = link.getAttribute('href');
					a.textContent = link.textContent.trim();
					if (link.classList.contains('active')) a.className = 'is-active';
					sub.appendChild(a);
				});

				details.appendChild(summary);
				details.appendChild(sub);
				nav.appendChild(details);
			} else {
				var row = document.createElement('a');
				row.href = trigger.getAttribute('href') || '#';
				row.className = 'scalex-sheet-row' + (active ? ' is-active' : '');
				rowChildren.forEach(function (child) { row.appendChild(child); });
				nav.appendChild(row);
			}
		});

		var logout = document.createElement('a');
		logout.className = 'scalex-sheet-logout';
		logout.href = '#';
		logout.innerHTML = '<span class="nav-icon nav-icon-mask" style="-webkit-mask-image:url(\'../htdocs/luci-static/scalex/icons/menu/logout.svg\');mask-image:url(\'../htdocs/luci-static/scalex/icons/menu/logout.svg\');" aria-hidden="true"></span><span>退出</span>';
		footer.appendChild(logout);
	}

	var sheetCloseTimer = null;

	function openSheet() {
		var refs = buildSheet();
		var menuBtn = document.getElementById('scalex-menu-btn');

		clearTimeout(sheetCloseTimer);
		refs.scrim.hidden = false;
		refs.sheet.hidden = false;
		requestAnimationFrame(function () {
			refs.scrim.classList.add('is-visible');
			refs.sheet.classList.add('is-open');
		});
		document.body.classList.add('scalex-sheet-open');
		var app = document.getElementById('view-app');
		if (app) app.inert = true;
		if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
		refs.sheet.querySelector('#scalex-sheet-close').focus();
	}

	function closeSheet(restoreFocus) {
		if (!sheetRefs) return;
		var refs = sheetRefs;
		var menuBtn = document.getElementById('scalex-menu-btn');

		refs.sheet.classList.remove('is-open');
		refs.scrim.classList.remove('is-visible');
		document.body.classList.remove('scalex-sheet-open');
		var app = document.getElementById('view-app');
		if (app) app.inert = false;
		if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');

		sheetCloseTimer = setTimeout(function () {
			refs.sheet.hidden = true;
			refs.scrim.hidden = true;
		}, 400);

		if (restoreFocus !== false && menuBtn) menuBtn.focus();
	}

	var menuBtn = document.getElementById('scalex-menu-btn');
	if (menuBtn) {
		menuBtn.addEventListener('click', function () {
			var refs = buildSheet();
			if (refs.sheet.classList.contains('is-open')) closeSheet();
			else openSheet();
		});
	}

	/* ── Settings preview ───────────────────────────────────────────── */

	var applyBtn = document.getElementById('cfg-apply');
	if (applyBtn) {
		applyBtn.addEventListener('click', function () {
			var accent = document.getElementById('cfg-primary').value;
			var root = document.documentElement;
			root.style.setProperty('--scalex-accent', accent);
			root.style.setProperty('--scalex-accent-hover', accent);
			root.style.setProperty('--scalex-primary', accent);
			root.style.setProperty('--scalex-primary-hover', accent);

			var model = document.getElementById('cfg-model').value.trim() || 'ScaleX-Router';
			document.querySelectorAll('.brand-host, .scalex-login-hostname').forEach(function (el) {
				el.textContent = model;
			});

			var overview = document.getElementById('scalex-overview');
			if (overview) overview.style.display = document.getElementById('cfg-dashboard').checked ? '' : 'none';

			showView('dashboard');
		});
	}

	var cancelBtn = document.querySelector('#view-settings [data-view="dashboard"]');
	if (cancelBtn)
		cancelBtn.addEventListener('click', function () { showView('dashboard'); });

	/* ── Sign-in preview ────────────────────────────────────────────── */

	var loginBtn = document.getElementById('demo-login-btn');
	if (loginBtn)
		loginBtn.addEventListener('click', function () { showView('dashboard'); });

	var password = document.getElementById('demo-pass');
	var passwordToggle = document.getElementById('demo-password-toggle');
	if (password && passwordToggle) {
		passwordToggle.addEventListener('click', function () {
			var show = password.type === 'password';
			password.type = show ? 'text' : 'password';
			passwordToggle.setAttribute('aria-pressed', show ? 'true' : 'false');
			passwordToggle.setAttribute('aria-label', show ? '隐藏密码' : '显示密码');
			password.focus();
		});
	}

	/* ── Live numbers ───────────────────────────────────────────────── */

	function rand(min, max) {
		return min + Math.random() * (max - min);
	}

	function tick() {
		var l1 = rand(0.15, 0.85);
		var l5 = l1 * rand(0.72, 0.96);
		var l15 = l1 * rand(0.52, 0.86);
		var pct = Math.round(rand(45, 72));
		var used = Math.round(pct * 2.56);

		var cpu = document.getElementById('demo-cpu');
		var cpuNote = document.getElementById('demo-cpu-note');
		var mem = document.getElementById('demo-mem');
		var memNote = document.getElementById('demo-mem-note');
		var memBar = document.getElementById('demo-mem-bar');

		if (cpu) cpu.textContent = l1.toFixed(2);
		if (cpuNote) cpuNote.textContent = '5m ' + l5.toFixed(2) + ' · 15m ' + l15.toFixed(2);
		if (mem) mem.textContent = pct + '%';
		if (memNote) memNote.textContent = used + ' MB / 256 MB';
		if (memBar) {
			memBar.style.width = pct + '%';
			memBar.classList.toggle('is-warning', pct >= 75);
		}
	}

	setInterval(tick, 4200);

	showView('dashboard');
})();
