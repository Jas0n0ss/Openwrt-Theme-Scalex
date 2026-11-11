/* ScaleX 5.0 — legacy (Lua/LuCI 18.06) interaction layer.
 * ES5 only: theme and the top-bar menu sheet. */
(function () {
	'use strict';

	var THEME_KEY = 'scalex-theme';
	var MODES = ['auto', 'light', 'dark'];

	function systemDark() {
		return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
	}

	function applyTheme(mode) {
		if (MODES.indexOf(mode) < 0) mode = 'auto';
		var dark = mode === 'dark' || (mode === 'auto' && systemDark());
		var root = document.documentElement;

		root.setAttribute('data-theme', mode);
		root.setAttribute('data-darkmode', dark ? 'true' : 'false');

		var meta = document.getElementById('meta-theme-color');
		if (meta) meta.setAttribute('content', dark ? '#000000' : '#f2f2f7');

		var buttons = document.querySelectorAll('[data-theme-mode]');
		for (var i = 0; i < buttons.length; i++) {
			buttons[i].setAttribute('aria-pressed',
				buttons[i].getAttribute('data-theme-mode') === mode ? 'true' : 'false');
		}
	}

	function setTheme(mode) {
		try { localStorage.setItem(THEME_KEY, mode); } catch (e) {}
		applyTheme(mode);
	}

	var initial = 'auto';
	try { initial = localStorage.getItem(THEME_KEY) || 'auto'; } catch (e) {}
	applyTheme(initial);

	var themeButtons = document.querySelectorAll('[data-theme-mode]');
	for (var t = 0; t < themeButtons.length; t++) {
		(function (btn) {
			btn.addEventListener('click', function () {
				setTheme(btn.getAttribute('data-theme-mode'));
			});
		})(themeButtons[t]);
	}

	if (window.matchMedia) {
		var mq = window.matchMedia('(prefers-color-scheme: dark)');
		var onScheme = function () {
			var current = 'auto';
			try { current = localStorage.getItem(THEME_KEY) || 'auto'; } catch (e) {}
			if (current === 'auto') applyTheme('auto');
		};
		if (mq.addEventListener) mq.addEventListener('change', onScheme);
		else if (mq.addListener) mq.addListener(onScheme);
	}

	/* ── Menu sheet ────────────────────────────────────────────────── */

	var sheet = null;
	var scrim = null;
	var closeTimer = null;

	function buildSheet() {
		if (sheet) return;

		scrim = document.createElement('div');
		scrim.className = 'scalex-scrim';
		scrim.id = 'scalex-scrim';
		scrim.hidden = true;

		sheet = document.createElement('div');
		sheet.className = 'scalex-sheet';
		sheet.id = 'scalex-sheet';
		sheet.setAttribute('role', 'dialog');
		sheet.setAttribute('aria-modal', 'true');
		sheet.setAttribute('aria-labelledby', 'scalex-sheet-title');
		sheet.hidden = true;
		sheet.innerHTML =
			'<div class="scalex-sheet-grabber" aria-hidden="true"></div>' +
			'<div class="scalex-sheet-head">' +
				'<h2 class="scalex-sheet-title" id="scalex-sheet-title">Browse</h2>' +
				'<button type="button" class="scalex-sheet-close" id="scalex-sheet-close" aria-label="Close menu">' +
					'<span class="scalex-symbol scalex-symbol-close" aria-hidden="true"></span>' +
				'</button>' +
			'</div>' +
			'<nav class="scalex-sheet-nav" id="scalex-sheet-nav" aria-label="Main navigation"></nav>' +
			'<div class="scalex-sheet-footer" id="scalex-sheet-footer"></div>';

		document.body.appendChild(scrim);
		document.body.appendChild(sheet);

		scrim.addEventListener('click', function () { closeSheet(); });
		sheet.querySelector('#scalex-sheet-close').addEventListener('click', function () { closeSheet(); });
		sheet.querySelector('#scalex-sheet-nav').addEventListener('click', function (e) {
			if (e.target.closest && e.target.closest('a')) closeSheet(false);
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
	}

	function buildSheetNav() {
		buildSheet();
		var nav = sheet.querySelector('#scalex-sheet-nav');
		var footer = sheet.querySelector('#scalex-sheet-footer');
		var topNav = document.getElementById('top-nav');
		if (!nav || !topNav) return;

		nav.innerHTML = '';
		footer.innerHTML = '';

		var sections = topNav.querySelectorAll('.top-nav-section');
		for (var i = 0; i < sections.length; i++) {
			var section = sections[i];
			var link = section.querySelector('.top-nav-link');
			if (!link) continue;

			var active = section.classList.contains('is-active');
			var subs = section.querySelectorAll('.top-nav-menu a');
			var text = document.createElement('span');
			text.className = 'nav-label';
			text.textContent = link.textContent;

			if (subs.length > 0) {
				var details = document.createElement('details');
				details.className = 'scalex-sheet-section';
				if (active) details.open = true;

				var summary = document.createElement('summary');
				summary.className = 'scalex-sheet-row' + (active ? ' is-active' : '');
				summary.appendChild(text);

				var sub = document.createElement('div');
				sub.className = 'scalex-sheet-sub';
				for (var j = 0; j < subs.length; j++) {
					var a = document.createElement('a');
					a.href = subs[j].getAttribute('href');
					a.textContent = subs[j].textContent;
					if (subs[j].classList.contains('active')) a.className = 'is-active';
					sub.appendChild(a);
				}

				details.appendChild(summary);
				details.appendChild(sub);
				nav.appendChild(details);
			} else {
				var row = document.createElement('a');
				row.href = link.getAttribute('href') || '#';
				row.className = 'scalex-sheet-row' + (active ? ' is-active' : '');
				row.appendChild(text);
				nav.appendChild(row);
			}
		}

		var logout = document.createElement('a');
		logout.className = 'scalex-sheet-row';
		logout.href = (document.querySelector('.topbar-logout') || {}).href || '#';
		logout.innerHTML = '<span class="nav-icon nav-icon-mask" style="-webkit-mask-image:url(\'/luci-static/scalex/icons/menu/logout.svg\');mask-image:url(\'/luci-static/scalex/icons/menu/logout.svg\');" aria-hidden="true"></span><span>Logout</span>';
		footer.appendChild(logout);
	}

	function openSheet(btn) {
		buildSheet();
		buildSheetNav();
		clearTimeout(closeTimer);

		scrim.hidden = false;
		sheet.hidden = false;
		requestAnimationFrame(function () {
			scrim.classList.add('is-visible');
			sheet.classList.add('is-open');
		});

		document.body.classList.add('scalex-sheet-open');
		var app = document.getElementById('scalex-app');
		if (app) app.inert = true;
		if (btn) btn.setAttribute('aria-expanded', 'true');
		sheet.querySelector('#scalex-sheet-close').focus();
	}

	function closeSheet(restore) {
		if (!sheet) return;

		sheet.classList.remove('is-open');
		scrim.classList.remove('is-visible');
		document.body.classList.remove('scalex-sheet-open');
		var app = document.getElementById('scalex-app');
		if (app) app.inert = false;

		var menuBtn = document.getElementById('scalex-menu-btn');
		if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');

		closeTimer = setTimeout(function () {
			sheet.hidden = true;
			scrim.hidden = true;
		}, 400);

		if (restore !== false && menuBtn) menuBtn.focus();
	}

	var menuBtn = document.getElementById('scalex-menu-btn');
	if (menuBtn) {
		menuBtn.addEventListener('click', function () { openSheet(menuBtn); });
	}
})();
