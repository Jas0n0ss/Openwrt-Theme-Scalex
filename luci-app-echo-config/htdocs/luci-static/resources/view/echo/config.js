'use strict';
'require view';
'require form';
'require uci';
'require ui';

return view.extend({
	render: function() {
		var m, s, o;

		m = new form.Map('echo', _('Echo Theme Configuration'),
			_('Customize the accent color, typography and dashboard of the Echo LuCI theme.'));

		s = m.section(form.NamedSection, 'global', 'global', _('Global Settings'));

		o = s.option(form.Value, 'primary', _('Primary Color (Light)'),
			_('Main accent color for light mode. Example: #0071e3'));
		o.placeholder = '#0071E3';

		o = s.option(form.Value, 'dark_primary', _('Primary Color (Dark)'),
			_('Main accent color for dark mode. Example: #0a84ff'));
		o.placeholder = '#0a84ff';

		o = s.option(form.ListValue, 'font_size', _('Base Font Size'));
		o.value('14', '14px');
		o.value('15', '15px');
		o.value('16', '16px (default)');
		o.value('17', '17px');

		o = s.option(form.Flag, 'dashboard', _('Enable Dashboard Cards'),
			_('Show the network hero, vitals and status panels on the Overview page.'));
		o.default = '1';
		o.rmempty = false;

		s = m.section(form.NamedSection, 'global', 'global', _('Background'));

		o = s.option(form.ListValue, 'background_mode', _('Background Mode'));
		o.value('gradient', _('Default gradient'));
		o.value('custom', _('Custom image'));
		o.value('none', _('None'));

		o = s.option(form.DummyValue, '_bg_help', _('Custom Background'),
			_('Place an image at /www/luci-static/echo/background/bg.jpg (or .png/.webp) on the router, then select Custom image.'));
		o.depends('background_mode', 'custom');

		if (form.FileUpload) {
			o = s.option(form.FileUpload, '_upload', _('Upload Background Image'),
				_('Supported: JPG, PNG, WebP.'));
			o.root_directory = '/www/luci-static/echo/background';
			o.filetypes = 'jpg jpeg png gif webp';
			o.depends('background_mode', 'custom');
		}

		return m.render();
	},

	handleSaveApply: function(ev) {
		return this.handleSave(ev).then(function() {
			ui.addNotification(null, E('p', {}, _('Echo theme settings saved. Refresh the page to apply.')), 'info');
		});
	}
});
