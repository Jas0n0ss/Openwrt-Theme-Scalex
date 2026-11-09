'use strict';
'require baseclass';

/*
 * Adaptive UI enhancer — normalizes dynamically loaded LuCI app views
 * (CBI forms, tables, modals) from any installed package.
 */
return baseclass.extend({
	__init__: function() {
		this._timer = null;
		this._main = document.getElementById('maincontent');
		if (!this._main) return;

		this.scheduleEnhance();
		new MutationObserver(L.bind(this.scheduleEnhance, this))
			.observe(this._main, { childList: true, subtree: true });
	},

	scheduleEnhance: function() {
		if (this._timer) return;
		var self = this;
		this._timer = window.setTimeout(function() {
			self._timer = null;
			self.enhance(self._main);
			self.hoistTabs();
		}, 50);
	},

	hoistTabs: function() {
		var contentTabs = document.getElementById('content-tabs');
		var main = this._main;
		if (!main || !contentTabs) return;
		if (contentTabs.querySelector('.content-tab') || contentTabs._switching) return;

		var allTabmenus = main.querySelectorAll('.cbi-tabmenu:not([data-echo-hidden])');
		if (allTabmenus.length === 0) return;

		/* Sub-nav shows L2 — hide duplicate in-page tabs unless L3+ tabs exist */
		if (document.body.classList.contains('has-sub-nav') &&
		    !document.body.classList.contains('has-content-tabs') &&
		    (L.env.dispatchpath || []).length < 3) {
			allTabmenus.forEach(function(ul) {
				ul.setAttribute('data-echo-hidden', '1');
				ul.style.display = 'none';
			});
			return;
		}

		var topTabmenu = allTabmenus[0];
		contentTabs.innerHTML = '';
		contentTabs.classList.remove('active');
		document.body.classList.remove('has-content-tabs');

		topTabmenu.querySelectorAll('li').forEach(function(li) {
			if (li.style.display === 'none') return;
			var a = li.querySelector('a');
			if (!a) return;
			var tab = a.cloneNode(true);
			tab.className = 'content-tab' + (li.classList.contains('cbi-tab') ? ' active' : '');
			tab.addEventListener('click', function(ev) {
				ev.preventDefault();
				contentTabs._switching = true;
				a.click();
				window.setTimeout(function() { contentTabs._switching = false; }, 100);
				contentTabs.querySelectorAll('.content-tab').forEach(function(t) {
					t.classList.remove('active');
				});
				tab.classList.add('active');
			});
			contentTabs.appendChild(tab);
		});

		topTabmenu.setAttribute('data-echo-hidden', '1');
		topTabmenu.style.display = 'none';
		contentTabs.dataset.echoAppTabs = '1';
		contentTabs.classList.add('active');
		document.body.classList.add('has-content-tabs');
	},

	enhance: function(root) {
		if (!root) return;

		root.querySelectorAll('table:not([data-echo-enhanced])').forEach(function(table) {
			if (table.closest('.echo-table-wrap')) return;
			/* Echo's own dashboard tables already live in a card and reflow on mobile. */
			if (table.classList.contains('echo-data-table') || table.closest('.echo-panel')) return;

			var wrap = E('div', { 'class': 'echo-table-wrap' });
			table.parentNode.insertBefore(wrap, table);
			wrap.appendChild(table);
			table.setAttribute('data-echo-enhanced', 'wrap');
		});

		root.querySelectorAll('.cbi-tabmenu:not([data-echo-enhanced])').forEach(function(ul) {
			ul.classList.add('echo-enhanced');
			ul.setAttribute('data-echo-enhanced', 'tabmenu');
		});

		root.querySelectorAll('.control-group:not([data-echo-enhanced]), .controls:not([data-echo-enhanced])').forEach(function(el) {
			el.classList.add('echo-control-group');
			el.setAttribute('data-echo-enhanced', 'control');
		});

		root.querySelectorAll('.modal:not([data-echo-enhanced]), .cbi-modal:not([data-echo-enhanced])').forEach(function(modal) {
			modal.classList.add('echo-modal');
			modal.setAttribute('data-echo-enhanced', 'modal');
		});

		root.querySelectorAll('.ifacebox:not([data-echo-enhanced]), .network-status-table:not([data-echo-enhanced])').forEach(function(box) {
			box.classList.add('echo-widget-box');
			box.setAttribute('data-echo-enhanced', 'widget');
		});

		root.querySelectorAll('.panel:not([data-echo-enhanced]), .well:not([data-echo-enhanced])').forEach(function(panel) {
			panel.classList.add('echo-panel');
			panel.setAttribute('data-echo-enhanced', 'panel');
		});

		root.querySelectorAll('.cbi-map:not([data-echo-enhanced])').forEach(function(map) {
			map.classList.add('echo-cbi-map');
			map.setAttribute('data-echo-enhanced', 'map');
		});

		root.querySelectorAll('iframe:not([data-echo-enhanced])').forEach(function(frame) {
			frame.classList.add('echo-iframe');
			frame.setAttribute('data-echo-enhanced', 'iframe');
		});

		var headerTitle = document.getElementById('header-title');
		var activeSub = document.querySelector('.nav-dropdown-item.active .nav-label');
		var compareTitle = headerTitle && headerTitle.textContent
			? headerTitle.textContent.trim()
			: (activeSub ? activeSub.textContent.trim() : '');

		if (compareTitle) {
			root.querySelectorAll(':scope > h2:first-child, :scope > .cbi-map > h2').forEach(function(h2) {
				if (h2.textContent.trim() === compareTitle)
					h2.classList.add('echo-sr-title');
			});
		}

		var descr = root.querySelector('.cbi-map-descr:not([data-echo-moved])');
		if (headerTitle && descr && !headerTitle.title) {
			descr.setAttribute('data-echo-moved', '1');
			headerTitle.title = descr.textContent.trim();
		}
	}
});
