'use strict';
'require baseclass';

/*
 * ScaleX 3.0 appearance controller.
 * Three explicit modes are persisted; "auto" follows the OS. Dark tokens live in
 * CSS, so switching only changes data-theme, color-scheme and the theme-color
 * meta value. No injected stylesheet is required.
 */
return baseclass.extend({
	ORDER: ['auto', 'light', 'dark'],
	KEY: 'scalex-theme',

	read: function() {
		try {
			var mode = localStorage.getItem(this.KEY);
			return this.ORDER.indexOf(mode) >= 0 ? mode : 'auto';
		} catch (e) {
			return 'auto';
		}
	},

	systemDark: function() {
		return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
	},

	resolve: function(mode) {
		return mode === 'dark' || (mode === 'auto' && this.systemDark());
	},

	apply: function(mode) {
		mode = this.ORDER.indexOf(mode) >= 0 ? mode : 'auto';

		var root = document.documentElement;
		var dark = this.resolve(mode);

		root.dataset.theme = mode;
		root.setAttribute('data-darkmode', dark ? 'true' : 'false');

		var meta = document.getElementById('meta-theme-color');
		if (meta)
			meta.setAttribute('content', dark ? '#000000' : '#f5f5f7');

		document.querySelectorAll('[data-theme-mode]').forEach(function(btn) {
			var active = btn.getAttribute('data-theme-mode') === mode;
			btn.setAttribute('aria-pressed', active ? 'true' : 'false');
		});

		return dark;
	},

	set: function(mode) {
		try { localStorage.setItem(this.KEY, mode); } catch (e) {}
		return this.apply(mode);
	},

	cycle: function() {
		var current = this.read();
		var next = this.ORDER[(this.ORDER.indexOf(current) + 1) % this.ORDER.length];
		this.set(next);
		return next;
	},

	__init__: function() {
		var self = this;
		var initial = this.read();

		this.apply(initial);

		document.querySelectorAll('[data-theme-mode]').forEach(function(btn) {
			btn.addEventListener('click', function() {
				self.set(btn.getAttribute('data-theme-mode'));
			});
		});

		/* Kept for plugins that still provide the original single toggle. */
		var legacy = document.getElementById('theme-toggle');
		if (legacy)
			legacy.addEventListener('click', function() { self.cycle(); });

		if (window.matchMedia) {
			var mq = window.matchMedia('(prefers-color-scheme: dark)');
			var onChange = function() {
				if (self.read() === 'auto')
					self.apply('auto');
			};

			if (mq.addEventListener)
				mq.addEventListener('change', onChange);
			else if (mq.addListener)
				mq.addListener(onChange);
		}
	}
});
