'use strict';
'require view';
'require form';
'require uci';
'require ui';

return view.extend({
	render: function() {
		var m, s, o;

		m = new form.Map('scalex', _('ScaleX Theme Configuration'),
			_('Customize the accent color, typography and dashboard of the ScaleX LuCI theme.'));

		s = m.section(form.NamedSection, 'global', 'global', _('Global Settings'));

		o = s.option(form.Value, 'primary', _('Primary Color (Light)'),
			_('Accent used for actions and selection in light mode. Leave empty for the default signal green. Example: #0a8f4d'));
		o.placeholder = '#0A8F4D';
		o.rmempty = true;

		o = s.option(form.Value, 'dark_primary', _('Primary Color (Dark)'),
			_('Accent used in dark mode. Leave empty for the default signal green. Example: #2ed97c'));
		o.placeholder = '#2ED97C';
		o.rmempty = true;

		o = s.option(form.ListValue, 'font_size', _('Base Font Size'));
		o.value('14', '14px');
		o.value('15', '15px');
		o.value('16', '16px (default)');
		o.value('17', '17px');

		o = s.option(form.Flag, 'dashboard', _('Enable Dashboard Cards'),
			_('Show the WAN / LAN link cards, vitals and port panels on the Overview page.'));
		o.default = '1';
		o.rmempty = false;

		s = m.section(form.NamedSection, 'global', 'global', _('Background'));

		o = s.option(form.ListValue, 'background_mode', _('Background Mode'));
		o.value('dots', _('Dot grid (default)'));
		o.value('none', _('Solid'));
		o.value('custom', _('Custom image'));
		o.default = 'dots';

		o = s.option(form.DummyValue, '_bg_help', _('Custom Background'),
			_('Place an image at /www/luci-static/scalex/background/bg.jpg (or .png/.webp) on the router, then select Custom image.'));
		o.depends('background_mode', 'custom');

		if (form.FileUpload) {
			o = s.option(form.FileUpload, '_upload', _('Upload Background Image'),
				_('Supported: JPG, PNG, WebP.'));
			o.root_directory = '/www/luci-static/scalex/background';
			o.filetypes = 'jpg jpeg png gif webp';
			o.depends('background_mode', 'custom');
		}

		return m.render();
	},

	handleSaveApply: function(ev) {
		return this.handleSave(ev).then(function() {
			ui.addNotification(null, E('p', {}, _('ScaleX theme settings saved. Refresh the page to apply.')), 'info');
		});
	}
});
