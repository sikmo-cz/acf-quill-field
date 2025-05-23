import { loader } from './components/loader.js';
import { WPMedia } from './components/wpmedia.js';
import { WPMediaToolbar } from './components/wpmedia-toolbar.js';
import { link } from './components/link.js';
import { customs } from './components/customs.js';

window.mainAcfQuillFieldPlugin = {
	init: function () {
		var self = this;

		WPMedia.init();
		WPMediaToolbar.init();
		
		window.link = link; // Make sure it's globally available
		link.init();
		
		customs.init();
		
		loader.init();
	},
};

document.addEventListener('DOMContentLoaded', () => {
	mainAcfQuillFieldPlugin.init();
});