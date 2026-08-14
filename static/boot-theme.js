(function () {
	try {
		var locale = localStorage.getItem('PARAGLIDE_LOCALE');
		if (locale) {
			document.documentElement.lang = locale;
		}

		var themeMeta = document.querySelector('meta[name="theme-color"]');
		if (localStorage.getItem('yamadori-outdoor-mode') === '1') {
			document.documentElement.dataset.outdoor = 'true';
			if (themeMeta) themeMeta.setAttribute('content', '#ffffff');
		} else if (localStorage.getItem('yamadori-dark-mode') === '1') {
			document.documentElement.dataset.dark = 'true';
			if (themeMeta) themeMeta.setAttribute('content', '#000000');
		}
	} catch (e) {
		/* ignore storage / DOM errors during early boot */
	}
})();
