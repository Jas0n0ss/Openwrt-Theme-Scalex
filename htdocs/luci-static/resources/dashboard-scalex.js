'use strict';
'require baseclass';
'require rpc';
'require uci';
'require fs';
'require network';

var callGetBuiltinEthernetPorts = rpc.declare({
	object: 'luci',
	method: 'getBuiltinEthernetPorts',
	expect: { result: [] }
});

var callNetworkDeviceStatus = rpc.declare({
	object: 'network.device',
	method: 'status',
	params: [ 'name' ],
	expect: { '': {} }
});

var callNetworkDeviceStatusAll = rpc.declare({
	object: 'network.device',
	method: 'status',
	expect: { '': {} }
});

var callInterfaceDump = rpc.declare({
	object: 'network.interface',
	method: 'dump',
	expect: { interface: [] }
});

return baseclass.extend({
	__init__: function() {
		this.enabled = true;
		this.container = null;
		this._leasesBody = null;
		this._ifaceBody = null;
		this._portsList = null;
		this._wifiList = null;
		this._portsGroup = null;
		this._wifiGroup = null;
		this._networkPanel = null;

		uci.load('scalex').then(L.bind(function() {
			this.enabled = uci.get('scalex', 'global', 'dashboard') !== '0';
			if (this.enabled) this.init();
		}, this)).catch(function() { this.init(); }.bind(this));
	},

	init: function() {
		var main = document.getElementById('maincontent');
		if (!main) return;

		this.watchPage();
		new MutationObserver(L.bind(this.watchPage, this)).observe(main, {
			childList: true,
			subtree: false
		});
		this.poll();
	},

	isOverviewPage: function() {
		var rp = L.env.requestpath.join('/');
		return rp === 'admin/status/overview' ||
			(document.body.dataset.page || '') === 'admin-status-overview';
	},

	watchPage: function() {
		if (!this.enabled || !this.isOverviewPage()) {
			if (this.container) {
				this.container.remove();
				this.container = null;
			}
			document.body.classList.remove('scalex-has-overview');
			return;
		}

		var main = document.getElementById('maincontent');
		if (!main || main.querySelector('#scalex-overview')) return;

		this.container = this.buildOverview();

		/* Never bury password / recovery warnings above the hero. */
		var anchor = main.firstChild;
		for (var i = 0; i < main.children.length; i++) {
			if (main.children[i].classList.contains('alert-message'))
				anchor = main.children[i].nextSibling;
		}
		main.insertBefore(this.container, anchor);
		document.body.classList.add('scalex-has-overview');
	},

	buildStatus: function() {
		var wan = this.statusItem('WAN', _('Checking…'));
		var wifi = this.statusItem('Wi-Fi', '—');
		var clients = this.statusItem('Clients', '—');

		this._statusWan = wan;
		this._statusWifi = wifi;
		this._statusClients = clients;

		this._statusTitle = E('h2', {
			'class': 'scalex-status-title',
			'id': 'scalex-status-title',
			'aria-live': 'polite'
		}, [ _('Checking network…') ]);

		this._statusSub = E('p', {
			'class': 'scalex-status-sub',
			'id': 'scalex-status-sub'
		}, [ _('Reading system status') ]);

		return E('section', { 'class': 'scalex-status', 'aria-labelledby': 'scalex-status-title' }, [
			E('div', { 'class': 'scalex-status-icon', 'aria-hidden': 'true' }, [
				E('span', { 'class': 'scalex-symbol scalex-symbol-router' })
			]),
			E('div', { 'class': 'scalex-status-copy' }, [
				E('p', { 'class': 'scalex-kicker' }, [ _('Network') ]),
				this._statusTitle,
				this._statusSub
			]),
			E('div', { 'class': 'scalex-status-aside' }, [ wan.el, wifi.el, clients.el ])
		]);
	},

	statusItem: function(label, value) {
		var dot = E('span', { 'class': 'scalex-dot is-off' });
		var valueEl = E('strong', {}, [ value ]);
		var el = E('span', { 'class': 'scalex-status-item' }, [
			dot,
			E('span', {}, [ label ]),
			valueEl
		]);

		return { el: el, value: valueEl, dot: dot };
	},

	buildVitals: function() {
		return E('section', { 'class': 'scalex-vitals', 'aria-label': _('System status') }, [
			this.vital('cpu', _('CPU'), 'cpu', _('Load average'), false),
			this.vital('memory', _('Memory'), 'memory', _('Used memory'), true),
			this.vital('uptime', _('Uptime'), 'clock', _('Since last boot'), false),
			this.vital('clients', _('Clients'), 'devices', _('Active devices'), false)
		]);
	},

	vital: function(id, label, icon, note, meter) {
		var children = [
			E('span', { 'class': 'scalex-vital-label' }, [
				E('span', { 'class': 'scalex-symbol scalex-symbol-' + icon, 'aria-hidden': 'true' }),
				E('span', {}, [ label ])
			]),
			E('strong', {
				'class': 'scalex-vital-value',
				'id': 'scalex-vital-' + id + '-value'
			}, [ '—' ]),
			E('span', {
				'class': 'scalex-vital-note',
				'id': 'scalex-vital-' + id + '-note'
			}, [ note ])
		];

		if (meter) {
			children.push(E('div', { 'class': 'scalex-vital-meter', 'aria-hidden': 'true' }, [
				E('span', { 'id': 'scalex-vital-' + id + '-bar' })
			]));
		}

		return E('div', { 'class': 'scalex-vital' }, children);
	},

	buildNetwork: function() {
		this._portsList = E('div', {});
		this._wifiList = E('div', {});
		this._portsGroup = E('div', { 'class': 'scalex-network-group scalex-network-ports' }, [
			E('div', { 'class': 'scalex-group-label' }, [ _('Ports') ]),
			this._portsList
		]);
		this._wifiGroup = E('div', { 'class': 'scalex-network-group scalex-network-wifi' }, [
			E('div', { 'class': 'scalex-group-label' }, [ _('Wi-Fi') ]),
			this._wifiList
		]);

		this._networkPanel = E('section', { 'class': 'scalex-card scalex-network' }, [
			E('div', { 'class': 'scalex-card-head' }, [
				E('div', { 'class': 'scalex-card-title' }, [
					E('span', { 'class': 'scalex-symbol scalex-symbol-port', 'aria-hidden': 'true' }),
					E('span', {}, [ _('Network') ])
				]),
				E('span', { 'class': 'scalex-live' }, [
					E('span', { 'class': 'scalex-dot' }),
					E('span', {}, [ _('Live') ])
				])
			]),
			E('div', { 'class': 'scalex-network-grid' }, [ this._portsGroup, this._wifiGroup ])
		]);

		return this._networkPanel;
	},

	buildOverview: function() {
		this._ifaceBody = E('tbody', {});
		this._leasesBody = E('tbody', {});

		return E('div', { id: 'scalex-overview', 'class': 'scalex-overview' }, [
			this.buildStatus(),
			this.buildVitals(),
			this.buildNetwork(),
			E('div', { 'class': 'scalex-grid' }, [
				this.panel(_('Interfaces'), this.table(_('Network interfaces'), [
					{ label: _('Interface') },
					{ label: _('Address') },
					{ label: _('Status'), cls: 'scalex-col-narrow' }
				], this._ifaceBody), 'globe'),
				this.panel(_('Clients'), this.table(_('Active DHCP clients'), [
					{ label: _('Hostname') },
					{ label: _('IP Address') },
					{ label: _('MAC') }
				], this._leasesBody), 'devices')
			]),
			E('p', { 'class': 'scalex-overview-note' }, [
				_('Primary status at a glance. Detailed metrics are shown in the sections below.')
			])
		]);
	},

	panel: function(title, tableEl, icon) {
		var titleChildren = [];
		if (icon)
			titleChildren.push(E('span', { 'class': 'scalex-symbol scalex-symbol-' + icon, 'aria-hidden': 'true' }));
		titleChildren.push(E('span', {}, [ title ]));

		return E('section', { 'class': 'scalex-card scalex-panel' }, [
			E('div', { 'class': 'scalex-card-head' }, [
				E('div', { 'class': 'scalex-card-title' }, titleChildren)
			]),
			tableEl
		]);
	},

	table: function(caption, headers, body) {
		var cells = headers.map(function(h) {
			return E('th', {
				'scope': 'col',
				'class': h.cls || null
			}, [ h.label ]);
		});

		return E('table', { 'class': 'scalex-data-table' }, [
			E('caption', { 'class': 'scalex-sr-only' }, [ caption ]),
			E('thead', {}, [ E('tr', {}, cells) ]),
			body
		]);
	},

	statusBadge: function(ok, label) {
		return E('span', { 'class': 'label ' + (ok ? 'success' : 'important') }, [
			label || (ok ? _('Online') : _('Offline'))
		]);
	},

	setText: function(id, value) {
		var el = document.getElementById(id);
		if (el) el.textContent = value;
	},

	setBar: function(id, pct, level) {
		var el = document.getElementById(id);
		if (!el) return;
		pct = Math.max(0, Math.min(100, pct));
		el.style.width = pct + '%';
		el.style.background = level === 'danger' ? 'var(--scalex-danger)' :
			(level === 'warning' ? 'var(--scalex-warning)' : 'var(--scalex-accent)');
	},

	setStatusItem: function(item, value, state) {
		if (!item) return;
		item.value.textContent = value;
		item.dot.className = 'scalex-dot' + (state ? ' ' + state : '');
	},

	setStatusTitle: function(value) {
		if (this._statusTitle && this._statusTitle.textContent !== value)
			this._statusTitle.textContent = value;
	},

	formatBytes: function(n) {
		if (!n || n < 0) return '0 B';
		var u = ['B', 'KB', 'MB', 'GB', 'TB'];
		var i = 0;
		while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
		return n.toFixed(i ? 1 : 0) + ' ' + u[i];
	},

	formatUptime: function(s) {
		if (!s) return '—';
		var d = Math.floor(s / 86400);
		var h = Math.floor((s % 86400) / 3600);
		var m = Math.floor((s % 3600) / 60);
		if (d > 0) return d + 'd ' + h + 'h ' + m + 'm';
		if (h > 0) return h + 'h ' + m + 'm';
		return m + 'm';
	},

	formatSpeedMbps: function(mbps) {
		mbps = parseInt(mbps, 10);
		if (isNaN(mbps) || mbps < 0) return '—';
		if (mbps >= 10000) return '10G';
		if (mbps >= 5000) return '5G';
		if (mbps >= 2500) return '2.5G';
		if (mbps >= 1000) return '1G';
		if (mbps >= 100) return '100M';
		if (mbps > 0) return mbps + 'M';
		return '—';
	},

	isVirtualNetdev: function(name, dev) {
		if (!name || name === 'lo') return true;
		if (/^@(lan|wan|\d+)/.test(name)) return true;
		if (/^(br-|docker|veth|tun|tap|wg|ppp|mv-|ifb|erspan)/.test(name)) return true;
		if (dev && (dev.wireless || dev.type === 'bridge')) return true;
		return false;
	},

	guessPortRole: function(device, ifaces) {
		var lname = (device || '').toLowerCase();
		if (lname.indexOf('wan') >= 0) return 'WAN';

		var i;
		for (i = 0; i < (ifaces || []).length; i++) {
			var iface = ifaces[i];
			var iname = (iface.interface || '').toLowerCase();
			var idev = (iface.device || iface.l3_device || '').toLowerCase();
			if (idev === lname && iname.indexOf('wan') >= 0) return 'WAN';
		}

		return 'LAN';
	},

	updateNetworkMapLayout: function(portCount, wifiCount) {
		if (this._portsGroup)
			this._portsGroup.hidden = portCount === 0;
		if (this._wifiGroup)
			this._wifiGroup.hidden = wifiCount === 0;
		if (this._networkPanel) {
			this._networkPanel.hidden = portCount === 0 && wifiCount === 0;
			this._networkPanel.classList.toggle('is-single', portCount === 0 || wifiCount === 0);
		}
	},

	mapEmptyNote: function(msg) {
		return E('p', { 'class': 'scalex-map-empty' }, [ msg ]);
	},

	wifiGeneration: function(hwmode, band) {
		band = (band || '').toLowerCase();
		hwmode = (hwmode || '').toLowerCase();
		if (hwmode === 'be' || band === '6g') return _('Wi-Fi 7');
		if (hwmode === 'ax' || hwmode === 'axg') return _('Wi-Fi 6');
		if (hwmode === 'ac' || hwmode === 'nac') return _('Wi-Fi 5');
		if (hwmode === 'n') return _('Wi-Fi 4');
		return _('Wi-Fi');
	},

	bandLabel: function(band) {
		var map = {
			'2g': _('2.4 GHz'),
			'5g': _('5 GHz'),
			'6g': _('6 GHz')
		};
		return map[(band || '').toLowerCase()] || band || '—';
	},

	portRole: function(role) {
		if (role === 'WAN') return _('WAN');
		if (role === 'LAN') return _('LAN');
		return role;
	},

	poll: function() {
		if (!this.enabled) return;
		var self = this;
		Promise.all([
			this.fetchSystem(),
			this.fetchNetwork(),
			this.fetchLeases(),
			this.fetchNetworkMap()
		]).finally(function() {
			window.setTimeout(function() { self.poll(); }, 10000);
		});
	},

	fetchSystem: function() {
		var self = this;

		return Promise.all([
			rpc.declare({ object: 'system', method: 'info' })(),
			rpc.declare({ object: 'system', method: 'board' })().catch(function() { return {}; })
		]).then(function(res) {
			var info = res[0] || {};
			var board = res[1] || {};
			var load = info.load || [0, 0, 0];
			var l1 = load[0] / 65536;
			var l5 = load[1] / 65536;
			var l15 = load[2] / 65536;

			self.setText('scalex-vital-cpu-value', l1.toFixed(2));
			self.setText('scalex-vital-cpu-note', _('5m') + ' ' + l5.toFixed(2) + ' · ' + _('15m') + ' ' + l15.toFixed(2));

			var mem = info.memory || {};
			var total = mem.total || 0;
			var free = mem.free || 0;
			var buffered = mem.buffered || 0;
			var cached = mem.cached || 0;
			var used = Math.max(0, total - free - buffered - cached);
			var pct = total ? Math.round((used / total) * 100) : 0;

			self.setText('scalex-vital-memory-value', pct + '%');
			self.setText('scalex-vital-memory-note', self.formatBytes(used) + ' / ' + self.formatBytes(total));
			self.setBar('scalex-vital-memory-bar', pct, pct >= 90 ? 'danger' : (pct >= 75 ? 'warning' : ''));

			self.setText('scalex-vital-uptime-value', self.formatUptime(info.uptime));
			self.setText('scalex-vital-uptime-note', _('Since last boot'));

			if (self._statusSub) {
				var model = board.model || board.system || 'OpenWrt';
				var release = board.release && board.release.description ? board.release.description : '';
				self._statusSub.textContent = model + (release ? ' · ' + release : '');
			}
		}).catch(function() {
			self.setText('scalex-vital-cpu-value', '—');
			self.setText('scalex-vital-memory-value', '—');
			self.setText('scalex-vital-uptime-value', '—');
		});
	},

	fetchNetwork: function() {
		var self = this;
		if (!this._ifaceBody) return Promise.resolve();

		return rpc.declare({
			object: 'network.interface',
			method: 'dump',
			expect: { interface: [] }
		})().then(function(ifaces) {
			self._ifaceBody.innerHTML = '';

			var shown = 0;
			var sawWan = false;
			var wanUp = false;

			for (var i = 0; i < ifaces.length; i++) {
				var iface = ifaces[i];
				var name = iface.interface || ('if' + i);
				var up = iface.up === true;
				var addr = '—';

				if (iface['ipv4-address'] && iface['ipv4-address'][0])
					addr = iface['ipv4-address'][0].address + '/' + iface['ipv4-address'][0].mask;
				else if (iface['ipv6-address'] && iface['ipv6-address'][0])
					addr = iface['ipv6-address'][0].address;

				if (name.charAt(0) === '@') continue;

				if (/wan/i.test(name)) {
					sawWan = true;
					if (up) wanUp = true;
				}

				var stats = iface.stats || {};
				var rx = stats.rx_bytes || 0;
				var tx = stats.tx_bytes || 0;

				self._ifaceBody.appendChild(E('tr', {}, [
					E('td', { 'data-label': _('Interface') }, [ E('strong', {}, [ name ]) ]),
					E('td', { 'data-label': _('Address'), 'class': 'scalex-mono' }, [ addr ]),
					E('td', { 'data-label': _('Download'), 'class': 'scalex-mono' }, [ self.formatBytes(rx) ]),
					E('td', { 'data-label': _('Upload'), 'class': 'scalex-mono' }, [ self.formatBytes(tx) ]),
					E('td', { 'data-label': _('Status'), 'class': 'scalex-col-narrow' }, [ self.statusBadge(up) ])
				]));
				shown++;
			}

			if (shown === 0) {
				self._ifaceBody.appendChild(E('tr', {}, [
					E('td', { colspan: '3', 'class': 'scalex-empty' }, [ '—' ])
				]));
			}

			if (sawWan)
				self.setStatusTitle(wanUp ? _('All systems online') : _('Internet needs attention'));
			else
				self.setStatusTitle(_('Network is running'));

			if (!sawWan)
				self.setStatusItem(self._statusWan, _('Not found'), 'is-off');
			else
				self.setStatusItem(self._statusWan, wanUp ? _('Online') : _('Offline'), wanUp ? '' : 'is-bad');
		}).catch(function() {
			self.setStatusTitle(_('Network status unavailable'));
		});
	},

	fetchLeases: function() {
		var self = this;
		if (!this._leasesBody) return Promise.resolve();

		return rpc.declare({
			object: 'luci-rpc',
			method: 'getDHCPLeases',
			expect: { 'dhcp-leases': [] }
		})().then(function(data) {
			var leases = data['dhcp-leases'] || data.leases || [];
			self._leasesBody.innerHTML = '';

			self.setText('scalex-vital-clients-value', leases.length);
			self.setText('scalex-vital-clients-note', _('Active devices'));
			self.setStatusItem(self._statusClients, leases.length, leases.length > 0 ? '' : 'is-off');

			if (leases.length === 0) {
				self._leasesBody.appendChild(E('tr', {}, [
					E('td', { colspan: '3', 'class': 'scalex-empty' }, [ _('No active DHCP clients') ])
				]));
				return leases;
			}

			leases.slice(0, 6).forEach(function(l) {
				self._leasesBody.appendChild(E('tr', {}, [
					E('td', { 'data-label': _('Hostname') }, [ l.hostname || '—' ]),
					E('td', { 'data-label': _('IP Address'), 'class': 'scalex-mono' }, [ l.ipaddr || '—' ]),
					E('td', { 'data-label': _('MAC'), 'class': 'scalex-mono scalex-dim' }, [ l.macaddr || '—' ])
				]));
			});

			if (leases.length > 6) {
				self._leasesBody.appendChild(E('tr', {}, [
					E('td', { colspan: '3', 'class': 'scalex-more' }, [
						'+ ' + (leases.length - 6) + ' ' + _('more clients')
					])
				]));
			}
			return leases;
		}).catch(function() {
			self._leasesBody.innerHTML = '';
			self._leasesBody.appendChild(E('tr', {}, [
				E('td', { colspan: '3', 'class': 'scalex-empty' }, [ '—' ])
			]));
			self.setText('scalex-vital-clients-value', '—');
			return [];
		});
	},

	fetchNetworkMap: function() {
		var self = this;
		if (!this._portsList) return Promise.resolve();

		return Promise.all([
			this.loadEthernetPorts(),
			this.loadWifiRadios()
		]).then(function(res) {
			self.renderPorts(res[0]);
			self.renderWifiRadios(res[1]);
			self.updateNetworkMapLayout(res[0].length, res[1].length);

			var radios = res[1] || [];
			var active = radios.filter(function(r) { return r.up; }).length;
			self.setStatusItem(self._statusWifi, radios.length ? (active + '/' + radios.length) : '—',
				radios.length ? (active === radios.length ? '' : 'is-warn') : 'is-off');
		}).catch(function() {
			self.renderPorts([]);
			self.renderWifiRadios([]);
			self.updateNetworkMapLayout(0, 0);
		});
	},

	loadEthernetPorts: function() {
		var self = this;

		return Promise.all([
			L.resolveDefault(callGetBuiltinEthernetPorts(), []),
			L.resolveDefault(fs.read('/etc/board.json'), '{}'),
			L.resolveDefault(callInterfaceDump(), []),
			L.resolveDefault(callNetworkDeviceStatusAll(), {}),
			uci.load('network').catch(function() { return null; })
		]).then(function(res) {
			var builtin = res[0] || [];
			var board = {};
			var ifaces = res[2] || [];
			var devStatus = res[3] || {};

			try {
				board = JSON.parse(res[1] || '{}');
			} catch (e) {
				board = {};
			}

			var entries = [];
			var seen = {};

			function pushEntry(device, role, label) {
				if (!device || seen[device]) return;
				seen[device] = true;
				entries.push({
					device: device,
					name: label || device,
					role: (role || 'lan').toUpperCase()
				});
			}

			builtin.forEach(function(p) {
				pushEntry(p.device, p.role, p.device);
			});

			if (entries.length === 0 && board.network) {
				[ 'lan', 'wan' ].forEach(function(role) {
					var block = board.network[role];
					if (!block) return;
					if (Array.isArray(block.ports))
						block.ports.forEach(function(dev) { pushEntry(dev, role); });
					else if (block.device)
						pushEntry(block.device, role);
				});
			}

			if (entries.length === 0) {
				Object.keys(devStatus).sort().forEach(function(name) {
					var d = devStatus[name];
					if (self.isVirtualNetdev(name, d)) return;
					pushEntry(name, self.guessPortRole(name, ifaces), name);
				});
			}

			return Promise.all(entries.map(function(entry) {
				return L.resolveDefault(callNetworkDeviceStatus(entry.device), {}).then(function(st) {
					var up = false;
					var speedMbps = -1;

					try {
						var nd = network.instantiateDevice(entry.device);
						up = nd.getCarrier();
						speedMbps = nd.getSpeed();
					} catch (e) {
						up = !!(st && (st.up || st.link || st.carrier));
						speedMbps = st && st.speed ? st.speed : -1;
					}

					if (entry.role === 'LAN' || entry.role === 'UNKNOWN')
						entry.role = self.guessPortRole(entry.device, ifaces);

					return {
						name: entry.name,
						role: entry.role,
						up: up,
						speed: self.formatSpeedMbps(speedMbps)
					};
				});
			})).then(function(ports) {
				ports.sort(function(a, b) {
					if (a.role !== b.role)
						return a.role === 'WAN' ? -1 : (b.role === 'WAN' ? 1 : 0);
					return L.naturalCompare(a.name, b.name);
				});
				return ports;
			});
		});
	},

	loadWifiRadios: function() {
		var self = this;

		if (L.hasSystemFeature && !L.hasSystemFeature('wifi'))
			return Promise.resolve([]);

		return Promise.all([
			L.resolveDefault(network.getWifiDevices(), []),
			L.resolveDefault(network.getWifiNetworks(), []),
			uci.load('wireless').catch(function() { return null; })
		]).then(function(res) {
			var radios = res[0] || [];
			var networks = res[1] || [];

			if (radios.length === 0)
				return self.loadWifiRadiosFromUci();

			var tasks = networks.map(function(net) {
				return L.resolveDefault(net.getAssocList(), []).then(function(list) {
					net._scalexAssoc = list.length;
					return net;
				});
			});

			return Promise.all(tasks).then(function() {
				var out = [];

				radios.sort(function(a, b) {
					return L.naturalCompare(a.getName(), b.getName());
				}).forEach(function(radio) {
					var nets = networks.filter(function(n) {
						return n.getWifiDeviceName() === radio.getName();
					});
					var ssid = '—';
					var enabled = 0;
					var clients = 0;
					var band = '';
					var hwmode = '';

					try {
						var sid = radio.getName();
						band = uci.get('wireless', sid, 'band') || '';
						hwmode = uci.get('wireless', sid, 'hwmode') || '';
					} catch (e) {}

					nets.forEach(function(net) {
						if (net.isDisabled()) return;
						enabled++;
						var active = net.getActiveSSID();
						if (active) ssid = active;
						clients += net._scalexAssoc || 0;
					});

					if (ssid === '—' && enabled > 0) {
						try {
							var wifaces = uci.sections('wireless', 'wifi-iface') || [];
							for (var i = 0; i < wifaces.length; i++) {
								if (wifaces[i].device === radio.getName() &&
								    uci.get('wireless', wifaces[i]['.name'], 'disabled') !== '1') {
									ssid = uci.get('wireless', wifaces[i]['.name'], 'ssid') || ssid;
									break;
								}
							}
						} catch (e2) {}
					}

					var bandKey = (band || '').toLowerCase();
					if (!bandKey && radio.getFrequency)
						bandKey = String(radio.getFrequency() || '').indexOf('6') === 0 ? '6g' : '';

					out.push({
						label: self.bandLabel(bandKey),
						gen: self.wifiGeneration(hwmode, bandKey),
						ssid: ssid,
						up: radio.isUp() && enabled > 0,
						meta: clients > 0
							? clients + ' ' + _('Clients')
							: enabled + ' ' + _('SSID'),
						wifi7: hwmode === 'be' || bandKey === '6g'
					});
				});

				return out;
			});
		}).catch(function() {
			return self.loadWifiRadiosFromUci();
		});
	},

	loadWifiRadiosFromUci: function() {
		var self = this;
		var radios = [];

		try {
			var devs = uci.sections('wireless', 'wifi-device') || [];
			var i;

			for (i = 0; i < devs.length; i++) {
				var sname = devs[i]['.name'];
				var band = uci.get('wireless', sname, 'band') || uci.get('wireless', sname, 'hwmode') || '';
				var hwmode = uci.get('wireless', sname, 'hwmode') || '';
				var disabled = uci.get('wireless', sname, 'disabled') === '1';
				var wifaces = uci.sections('wireless', 'wifi-iface') || [];
				var ssid = '—';
				var enabledIfaces = 0;
				var j;

				for (j = 0; j < wifaces.length; j++) {
					if (wifaces[j].device !== sname) continue;
					ssid = uci.get('wireless', wifaces[j]['.name'], 'ssid') || ssid;
					if (uci.get('wireless', wifaces[j]['.name'], 'disabled') !== '1')
						enabledIfaces++;
				}

				radios.push({
					label: self.bandLabel(band),
					gen: self.wifiGeneration(hwmode, band),
					ssid: ssid,
					up: !disabled && enabledIfaces > 0,
					meta: enabledIfaces + ' ' + _('SSID'),
					wifi7: hwmode === 'be' || (band || '').toLowerCase() === '6g'
				});
			}
		} catch (e) {}

		return Promise.resolve(radios);
	},

	renderPorts: function(ports) {
		var self = this;
		this._portsList.innerHTML = '';

		if (!ports || ports.length === 0) {
			this._portsList.appendChild(this.mapEmptyNote(_('No Ethernet ports detected on this device.')));
			return;
		}

		ports.forEach(function(p) {
			self._portsList.appendChild(E('div', { 'class': 'scalex-row' }, [
				E('span', { 'class': 'scalex-dot' + (p.up ? '' : ' is-off') }),
				E('span', { 'class': 'scalex-row-name' }, [ p.name ]),
				E('span', { 'class': 'scalex-row-meta' }, [ p.speed ]),
				E('span', { 'class': 'scalex-row-role' }, [ self.portRole(p.role) ])
			]));
		});
	},

	renderWifiRadios: function(radios) {
		var self = this;
		this._wifiList.innerHTML = '';

		if (!radios || radios.length === 0) {
			this._wifiList.appendChild(this.mapEmptyNote(_('No wireless radios on this device.')));
			return;
		}

		radios.forEach(function(r) {
			self._wifiList.appendChild(E('div', { 'class': 'scalex-row' }, [
				E('span', { 'class': 'scalex-dot' + (r.up ? '' : ' is-off') }),
				E('span', { 'class': 'scalex-wifi-band' }, [ r.label ]),
				E('span', { 'class': 'scalex-wifi-ssid' }, [ r.ssid ]),
				E('span', { 'class': 'scalex-wifi-gen' }, [ r.gen ]),
				E('span', { 'class': 'scalex-row-status' }, [ r.meta ])
			]));
		});
	}

});
