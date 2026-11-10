(function () {
	'use strict';

	var THEME_KEY = 'scalex-theme';
	var MODES = ['auto', 'light', 'dark'];
	var params = new URLSearchParams(window.location.search);

	if (params.get('clean') === '1')
		document.body.classList.add('demo-clean-view');

	var appView = document.getElementById('view-app');
	var loginView = document.getElementById('view-login');
	var overview = document.getElementById('scalex-overview');
	var nativeSection = document.getElementById('demo-native-section');
	var settings = document.getElementById('settings-content');
	var pageTitle = document.getElementById('header-title');
	var pageCrumb = document.getElementById('header-breadcrumb');

	function showView(name) {
		var isLogin = name === 'login';
		var isSettings = name === 'settings';

		if (appView) appView.hidden = isLogin;
		if (loginView) loginView.hidden = !isLogin;

		if (overview) overview.hidden = isSettings;
		if (nativeSection) nativeSection.hidden = isSettings;
		if (settings) settings.hidden = !isSettings;

		if (pageTitle) pageTitle.textContent = isSettings ? 'ScaleX 主题' : '概览';
		if (pageCrumb) pageCrumb.textContent = isSettings ? '系统' : '状态';

		var navView = isSettings ? 'system' : 'status';
		document.querySelectorAll('.sidebar-section[data-view]').forEach(function (section) {
			section.classList.toggle('is-active', section.dataset.view === navView);
		});

		document.querySelectorAll('.demo-btn[data-view]').forEach(function (btn) {
			btn.classList.toggle('active', btn.dataset.view === name);
		});

		document.body.classList.toggle('scalex-login', isLogin);
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
		if (meta) meta.setAttribute('content', dark ? '#000000' : '#f2f2f7');

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

	/* ── Mobile sheet ───────────────────────────────────────────────── */

	var sheetRefs = null;
	var sheetCloseTimer = null;

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
			var first = focusable[0], last = focusable[focusable.length - 1];

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

		Array.prototype.forEach.call(topNav.querySelectorAll('.sidebar-section'), function (section) {
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
			rowChildren.push(Object.assign(document.createElement('span'), { className: 'nav-label', textContent: title }));

			if (subLinks.length) {
				var caret = document.createElement('span');
				caret.className = 'nav-caret';
				caret.setAttribute('aria-hidden', 'true');
				caret.innerHTML = '<span class="scalex-symbol scalex-symbol-chevron"></span>';
				rowChildren.push(caret);

				var details = document.createElement('details');
				details.className = 'scalex-sheet-section';
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
				row.href = href;
				row.className = 'scalex-sheet-row' + (active ? ' is-active' : '');
				rowChildren.forEach(function (child) { row.appendChild(child); });
				nav.appendChild(row);
			}
		});

		var logout = document.createElement('a');
		logout.className = 'scalex-sheet-row';
		logout.href = '#';
		logout.innerHTML = '<span class="nav-icon nav-icon-mask" style="-webkit-mask-image:url(\'../htdocs/luci-static/scalex/icons/menu/logout.svg\');mask-image:url(\'../htdocs/luci-static/scalex/icons/menu/logout.svg\');" aria-hidden="true"></span><span>退出</span>';
		footer.appendChild(logout);
	}

	function openSheet() {
		var refs = buildSheet();
		var menuBtn = document.getElementById('scalex-menu-btn');
		var app = document.getElementById('view-app');

		clearTimeout(sheetCloseTimer);
		refs.scrim.hidden = false;
		refs.sheet.hidden = false;
		requestAnimationFrame(function () {
			refs.scrim.classList.add('is-visible');
			refs.sheet.classList.add('is-open');
		});
		document.body.classList.add('scalex-sheet-open');
		if (app) app.inert = true;
		if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
		refs.sheet.querySelector('#scalex-sheet-close').focus();
	}

	function closeSheet(restoreFocus) {
		if (!sheetRefs) return;
		var refs = sheetRefs;
		var menuBtn = document.getElementById('scalex-menu-btn');
		var app = document.getElementById('view-app');

		refs.sheet.classList.remove('is-open');
		refs.scrim.classList.remove('is-visible');
		document.body.classList.remove('scalex-sheet-open');
		if (app) app.inert = false;
		if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');

		sheetCloseTimer = setTimeout(function () {
			refs.sheet.hidden = true;
			refs.scrim.hidden = true;
		}, 400);

		if (restoreFocus !== false && menuBtn) menuBtn.focus();
	}

	var navSearch = document.getElementById('scalex-nav-search');
	if (navSearch) {
		navSearch.addEventListener('input', function () {
			var q = navSearch.value.trim().toLowerCase();
			document.querySelectorAll('.sidebar-section').forEach(function (section) {
				var match = !q || section.textContent.toLowerCase().indexOf(q) >= 0;
				section.hidden = !match;
				section.classList.toggle('is-search', !!q && match);
			});
			if (sheetRefs) buildSheetNav();
		});
		navSearch.addEventListener('keydown', function (e) {
			if (e.key === 'Escape') {
				navSearch.value = '';
				navSearch.dispatchEvent(new Event('input'));
				navSearch.blur();
			}
		});
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
			document.querySelectorAll('.sidebar-brand-text small, .scalex-login-hostname').forEach(function (el) {
				el.textContent = model;
			});

			var overview = document.getElementById('scalex-overview');
			if (overview) overview.style.display = document.getElementById('cfg-dashboard').checked ? '' : 'none';

			showView('dashboard');
		});
	}

	var cancelBtn = document.getElementById('cfg-cancel');
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

		var cpu = document.getElementById('demo-vital-cpu');
		var cpuNote = document.getElementById('demo-vital-cpu-note');
		var mem = document.getElementById('demo-vital-memory');
		var memNote = document.getElementById('demo-vital-memory-note');
		var memBar = document.getElementById('demo-vital-memory-bar');

		if (cpu) cpu.textContent = l1.toFixed(2);
		if (cpuNote) cpuNote.textContent = '5 分钟 ' + l5.toFixed(2) + ' · 15 分钟 ' + l15.toFixed(2);
		if (mem) mem.textContent = pct + '%';
		if (memNote) memNote.textContent = used + ' MB / 256 MB';
		if (memBar) memBar.style.width = pct + '%';
	}

	setInterval(tick, 4200);

	showView('dashboard');
})();
