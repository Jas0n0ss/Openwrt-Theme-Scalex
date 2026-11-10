/* ScaleX 2.1 — legacy (Lua/LuCI 18.06) interaction layer.
 * Plain ES5: no L.require, no modules, no modern syntax. */

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
		document.documentElement.setAttribute('data-theme', mode);
		document.documentElement.setAttribute('data-darkmode', dark ? 'true' : 'false');

		var meta = document.getElementById('meta-theme-color');
		if (meta) meta.setAttribute('content', dark ? '#000000' : '#f5f5f7');

		var buttons = document.querySelectorAll('[data-theme-mode]');
		for (var i = 0; i < buttons.length; i++) {
			buttons[i].setAttribute('aria-pressed',
				buttons[i].getAttribute('data-theme-mode') === mode ? 'true' : 'false');
		}
	}

	var initial = 'auto';
	try { initial = localStorage.getItem(THEME_KEY) || 'auto'; } catch (e) {}
	applyTheme(initial);

	var themeButtons = document.querySelectorAll('[data-theme-mode]');
	for (var t = 0; t < themeButtons.length; t++) {
		themeButtons[t].addEventListener('click', function () {
			var mode = this.getAttribute('data-theme-mode');
			try { localStorage.setItem(THEME_KEY, mode); } catch (e) {}
			applyTheme(mode);
		});
	}

	if (window.matchMedia) {
		var mq = window.matchMedia('(prefers-color-scheme: dark)');
		var onChange = function () {
			var mode = 'auto';
			try { mode = localStorage.getItem(THEME_KEY) || 'auto'; } catch (e) {}
			if (mode === 'auto') applyTheme('auto');
		};
		if (mq.addEventListener) mq.addEventListener('change', onChange);
		else if (mq.addListener) mq.addListener(onChange);
	}

	/* ── Desktop dropdowns ─────────────────────────────────────────── */

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
		var sections = document.querySelectorAll('.nav-section.has-dropdown');
		for (var i = 0; i < sections.length; i++) {
			if (sections[i] !== except) setDropdown(sections[i], false);
		}
	}

	if (navBar) {
		navBar.addEventListener('click', function (e) {
			var section = e.target.closest ? e.target.closest('.nav-section.has-dropdown') : null;
			if (!section || e.target.closest('.nav-dropdown-item')) return;

			var trigger = section.querySelector('.nav-top');
			if (!trigger || e.target.closest('.nav-top') !== trigger) return;

			e.preventDefault();
			e.stopPropagation();

			var open = !section.classList.contains('open');
			closeDropdowns();
			if (open) setDropdown(section, true);
		});

		document.addEventListener('click', function (e) {
			if (!e.target.closest || !e.target.closest('.nav-section.has-dropdown'))
				closeDropdowns();
		});

		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape') {
				closeDropdowns();
				if (e.target.closest) {
					var trigger = e.target.closest('.nav-top');
					if (trigger) trigger.focus();
				}
			}
		});
	}

	/* ── Mobile sheet ──────────────────────────────────────────────── */

	var refs = null;

	function buildSheet() {
		if (refs) return refs;

		var scrim = document.createElement('div');
		scrim.id = 'scalex-scrim';
		scrim.className = 'scalex-scrim';
		scrim.hidden = true;

		var sheet = document.createElement('div');
		sheet.id = 'scalex-sheet';
		sheet.className = 'scalex-sheet';
		sheet.setAttribute('role', 'dialog');
		sheet.setAttribute('aria-modal', 'true');
		sheet.setAttribute('aria-labelledby', 'scalex-sheet-title');
		sheet.hidden = true;
		sheet.innerHTML =
			'<div class="scalex-sheet-grabber" aria-hidden="true"></div>' +
			'<div class="scalex-sheet-head">' +
				'<h2 class="scalex-sheet-title" id="scalex-sheet-title">Browse</h2>' +
				'<button type="button" class="scalex-sheet-close" aria-label="Close menu">' +
					'<span class="scalex-symbol scalex-symbol-close" aria-hidden="true"></span>' +
				'</button>' +
			'</div>' +
			'<nav class="scalex-sheet-nav" aria-label="Main navigation"></nav>' +
			'<div class="scalex-sheet-footer"></div>';

		document.body.appendChild(scrim);
		document.body.appendChild(sheet);

		refs = { scrim: scrim, sheet: sheet };
		buildSheetNav();
		scrim.addEventListener('click', function () { closeSheet(); });
		sheet.querySelector('.scalex-sheet-close').addEventListener('click', function () { closeSheet(); });
		sheet.querySelector('.scalex-sheet-nav').addEventListener('click', function (e) {
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

		return refs;
	}

	function buildSheetNav() {
		var topNav = document.getElementById('top-nav');
		var nav = refs.sheet.querySelector('.scalex-sheet-nav');
		var footer = refs.sheet.querySelector('.scalex-sheet-footer');
		if (!topNav || !nav) return;

		nav.innerHTML = '';
		footer.innerHTML = '';

		var sections = topNav.querySelectorAll('.nav-section');
		for (var i = 0; i < sections.length; i++) {
			var section = sections[i];
			if (section.classList.contains('nav-logout')) continue;

			var trigger = section.querySelector('.nav-top');
			var label = section.querySelector('.nav-label');
			if (!trigger || !label) continue;

			var title = label.textContent;
			var subLinks = section.querySelectorAll('.nav-dropdown-item');
			var active = section.classList.contains('is-active');
			var row = document.createElement(subLinks.length ? 'summary' : 'a');

			if (!subLinks.length) row.href = trigger.getAttribute('href') || '#';
			row.className = 'scalex-sheet-row' + (active ? ' is-active' : '');

			var icon = section.querySelector('.nav-icon');
			if (icon) row.appendChild(icon.cloneNode(true));
			var text = document.createElement('span');
			text.className = 'nav-label';
			text.textContent = title;
			row.appendChild(text);

			if (subLinks.length) {
				var details = document.createElement('details');
				details.className = 'scalex-sheet-group';
				if (active) details.open = true;

				var caret = document.createElement('span');
				caret.className = 'nav-caret';
				caret.setAttribute('aria-hidden', 'true');
				caret.innerHTML = '<span class="scalex-symbol scalex-symbol-chevron"></span>';
				row.appendChild(caret);

				var sub = document.createElement('div');
				sub.className = 'scalex-sheet-sub';
				for (var j = 0; j < subLinks.length; j++) {
					var a = document.createElement('a');
					a.href = subLinks[j].getAttribute('href');
					a.textContent = subLinks[j].textContent;
					if (subLinks[j].classList.contains('active')) a.className = 'is-active';
					sub.appendChild(a);
				}

				details.appendChild(row);
				details.appendChild(sub);
				nav.appendChild(details);
			} else {
				nav.appendChild(row);
			}
		}

		var logout = document.createElement('a');
		logout.className = 'scalex-sheet-logout';
		logout.href = (document.querySelector('.nav-logout-link') || {}).href || '#';
		logout.innerHTML = '<span class="nav-icon nav-icon-mask" style="-webkit-mask-image:url(\'/luci-static/scalex/icons/menu/logout.svg\');mask-image:url(\'/luci-static/scalex/icons/menu/logout.svg\');" aria-hidden="true"></span><span>Logout</span>';
		footer.appendChild(logout);
	}

	var closeTimer = null;

	function openSheet() {
		var r = buildSheet();
		var btn = document.getElementById('scalex-menu-btn');
		clearTimeout(closeTimer);
		r.scrim.hidden = false;
		r.sheet.hidden = false;
		setTimeout(function () {
			r.scrim.classList.add('is-visible');
			r.sheet.classList.add('is-open');
		}, 10);
		document.body.classList.add('scalex-sheet-open');
		if (btn) btn.setAttribute('aria-expanded', 'true');
		r.sheet.querySelector('.scalex-sheet-close').focus();
	}

	function closeSheet(restoreFocus) {
		if (!refs) return;
		var r = refs;
		var btn = document.getElementById('scalex-menu-btn');
		r.sheet.classList.remove('is-open');
		r.scrim.classList.remove('is-visible');
		document.body.classList.remove('scalex-sheet-open');
		if (btn) btn.setAttribute('aria-expanded', 'false');
		closeTimer = setTimeout(function () {
			r.sheet.hidden = true;
			r.scrim.hidden = true;
		}, 400);
		if (restoreFocus !== false && btn) btn.focus();
	}

	var menuBtn = document.getElementById('scalex-menu-btn');
	if (menuBtn) {
		menuBtn.addEventListener('click', function () {
			var r = buildSheet();
			if (r.sheet.classList.contains('is-open')) closeSheet();
			else openSheet();
		});
	}
})();
