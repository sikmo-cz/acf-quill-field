var WPMedia = {  
	wpmediaIcon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" color="#000000" fill="none"> <path class="ql-stroke" d="M2.5 16.502L7.46967 11.5323C7.80923 11.1927 8.26978 11.002 8.75 11.002C9.23022 11.002 9.69077 11.1927 10.0303 11.5323L14 15.502M15.5 17.002L14 15.502M21.5 16.502L18.5303 13.5323C18.1908 13.1927 17.7302 13.002 17.25 13.002C16.7698 13.002 16.3092 13.1927 15.9697 13.5323L14 15.502" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> <path class="ql-stroke" d="M15.5 8.00195C15.7761 8.00195 16 7.7781 16 7.50195C16 7.22581 15.7761 7.00195 15.5 7.00195M15.5 8.00195C15.2239 8.00195 15 7.7781 15 7.50195C15 7.22581 15.2239 7.00195 15.5 7.00195M15.5 8.00195V7.00195" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> <path class="ql-stroke" d="M21.5 19.502V4.50195C21.5 3.39738 20.6046 2.50195 19.5 2.50195H4.5C3.39543 2.50195 2.5 3.39738 2.5 4.50195V19.502C2.5 20.6065 3.39543 21.502 4.5 21.502H19.5C20.6046 21.502 21.5 20.6065 21.5 19.502Z" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>',

	init: function () {		
		const self = this;

		const Toolbar = Quill.import('modules/toolbar');
		const BaseImage = Quill.import('formats/image');   // <- inline image that Quill ships
		const icons = Quill.import('ui/icons');

		/* ----------------------------------------------------------
		* 1.  Drop your custom SVG into Quill’s icon registry
		* --------------------------------------------------------- */
		icons['wp-media'] = self.wpmediaIcon;

		class WPImageBlot extends BaseImage {
			static blotName = 'wpimage';      // keep our own name
			static tagName  = 'img';          // same as before

			static create(value = {}) {
				// the core Image blot already creates <img src="…">
				const node = super.create(value.src || value);

				// copy every WP attribute over
				Object.entries(value).forEach(([k, v]) => {
				if (v != null) node.setAttribute(k, v);
				});
				return node;
			}

			static value(node) {
				return Array.from(node.attributes).reduce((o, a) => {
				o[a.name] = a.value;
				return o;
				}, {});
			}
		}

		Quill.register(WPImageBlot, true);  // ‘true’ = overwrite if it exists

		// ---------- 2. Add a toolbar button ----------
		Toolbar.DEFAULTS['handlers']['wp-media'] = self.openMedia;
	},

	openMedia: function() {
		const quill = this.quill;
		const range = quill.getSelection(true);
	
		const frame = wp.media({
			frame   : 'post',          // gives Attachment Display Settings
			state   : 'insert',
			library : { type: 'image' },
			multiple: false
		});

		frame.$el.addClass( 'acf-quill-field-add-media' );
	
		frame.on('insert', () => {
			/* --------------------------------------------------
			* 1. Attachment & display settings
			* -------------------------------------------------- */
			const state      = frame.state();
			const attachment = state.get('selection').first();   // we allowed only one
			if ( ! attachment ) return;
		
			const atts = attachment.toJSON();
		
			let display 	= state.display( attachment ).toJSON();  // align, size, link-to…
			let linkToFile 	= display.link == 'file' ? atts.url : false;

			display     	= wp.media.string.props( display, attachment );
			display.linkUrl = linkToFile === false ? display.linkUrl : linkToFile;
		
			/* --------------------------------------------------
			* 2. Resolve the URL & dimensions for the chosen size
			*    (falls back to full size if that size doesn’t exist,
			*     e.g. for an SVG)
			* -------------------------------------------------- */
			const sizeData  = atts?.sizes?.[ display.size ] || atts;
			const attrs = {
				src               : sizeData.url,
				width             : sizeData.width,
				height            : sizeData.height,
				alt               : atts.alt,
				title             : atts.title,
				class             : `align${display.align || 'none'} size-${display.size} wp-image-${atts.id}`,
				// 'data-wp-media-id': atts.id,
			};
		
			/* --------------------------------------------------
			* 3. Insert the image blot + newline => <p><img></p>
			* -------------------------------------------------- */
			quill.insertEmbed(range.index, 'wpimage', attrs, 'user');
			quill.insertText(range.index + 1, '\n', 'user');
		
			/* --------------------------------------------------
			* 4. Wrap with <a href="…"> if the user chose a link
			* -------------------------------------------------- */
			if ( display.linkUrl && display.linkUrl !== 'none' ) {
				quill.formatText(range.index, 1, { link: display.linkUrl }, 'user');
			}
		
			/* Caret after the image */
			quill.setSelection(range.index + 2, 0);
		});
	
		frame.open();
	}
}

export { WPMedia };