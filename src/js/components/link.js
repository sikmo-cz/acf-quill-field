var link = {
	init: function() {
		const self = this;

		self.previewLink();
		// console.log('Link module init called');
		
		/* ------- 1. register the custom blot once ------- */
		if (!Quill.__acfLinkBlotReady) {
			// console.log('Registering WPLinkBlot');
			const BaseLink = Quill.import('formats/link');

			class WPLinkBlot extends BaseLink {
				static create(v = {}) {
					// console.log('WPLinkBlot create:', v);
					// Don't use super.create which adds unwanted attributes
					let node;
					
					if (typeof v === 'string') {
						node = document.createElement('a');
						node.setAttribute('href', v);
					} else {
						node = document.createElement('a');
						// If v.href is an object, stringify it first
						const href = (v.href && typeof v.href === 'object') ? 
							(v.href.toString() === '[object Object]' ? '#' : v.href.toString()) : 
							v.href;
						node.setAttribute('href', href);
						
						// Only add specified attributes, not defaults
						if (v.title) node.setAttribute('title', v.title);
						if (v.rel) node.setAttribute('rel', v.rel);
						if (v.target) node.setAttribute('target', v.target);
						if (v.class) node.setAttribute('class', v.class);
					}
					
					return node;
				}
				
				static formats(node) {
					// console.log( 'node', node );
					const f = { href: node.getAttribute('href') };
					['title', 'rel', 'target', 'class'].forEach(k => {
						const v = node.getAttribute(k); 
						if (v) f[k] = v;
					});
					// console.log('WPLinkBlot formats:', f);
					return f;
				}
			}
			Quill.register(WPLinkBlot, true);
			Quill.__acfLinkBlotReady = true;
			// console.log('__acfLinkBlotReady - registered custom link blot');
		}

		/* ------- 2. Add handler to be called after all editors are initialized ------- */
		document.addEventListener('acf-quill-editors-loaded', this.attachToEditors);
		
		/* If the event was already fired, call our handler directly */
		if (window.acfQuillEditorsLoaded) {
			// console.log('Editors already loaded, attaching now');
			this.attachToEditors();
		}
		
		/* ------- 3. Add event listener for clicking on links ------- */
		document.addEventListener('click', this.handleLinkClick);
	},

	previewLink: function() {
		if( typeof jQuery === 'undefined' ) {
			return false;
		}

		jQuery( document ).on( 'mouseenter', '.ql-editor a', function(){
			let thisEl 	= jQuery( this );
			let href 	= thisEl.attr( 'href' );

			let target 	= thisEl.attr( 'target' ) ?? false;
			target 		= target == '_blank' ? `, ${acf_quill_field.l10n.tooltip.new_tab}` : '';

			let tooltipPos = 'up'; // right
			// tooltipPos = thisEl.parent().hasClass( 'ql-align-center' ) || thisEl.find( 'img' ).hasClass( 'aligncenter' ) ? 'up' : tooltipPos;
			// tooltipPos = thisEl.parent().hasClass( 'ql-align-right' ) || thisEl.find( 'img' ).hasClass( 'alignright' ) ? 'left' : tooltipPos;

			jQuery( this ).attr( 'data-balloon-pos', tooltipPos );
			jQuery( this ).attr( 'aria-label', `${href}${target}` );
		}).on('mouseleave', '.ql-editor a', function () {
			jQuery( this ).removeAttr( 'data-balloon-pos' );
			jQuery( this ).removeAttr( 'aria-label' );
		});
	},
	
	/* ----------------------------------------------------------------
	 *  Handle clicks on links within the editor to edit them
	 * ---------------------------------------------------------------- */
	handleLinkClick(e) {
		// Only handle clicks inside Quill editors
		const editorEl = e.target.closest('.acf-quill-editor');
		if (!editorEl || !editorEl.__quill) return;
		
		// Check if we clicked on a link or within a link
		const linkEl = e.target.closest('a');
		if (!linkEl) return;

		// Check if clicked directly on an image - if so, don't open the link modal
		if (e.target.tagName === 'IMG') {
			// console.log('Clicked on image inside link - not opening link modal');
			return; // Exit early, allowing the default image handling
		}
		
		// Prevent default link behavior
		e.preventDefault();
		
		// Get the Quill instance
		const quill = editorEl.__quill;
		
		// Find the link's position within the editor
		const linkBlot = Quill.find(linkEl);
		if (!linkBlot) return;
		
		const index = linkBlot.offset(quill.scroll);
		if (index === undefined) return;
		
		// Get the link's length to select it
		const length = linkBlot.length();
		
		// Select the link text
		quill.setSelection(index, length);
		
		// Open the link dialog with current attributes
		const linkFormat = linkBlot.formats();
		// console.log('Link clicked, format:', linkFormat);
		
		const attrs = {
			href: linkFormat.link?.href || linkFormat.href || '',
			title: linkFormat.link?.title || linkFormat.title || '',
			rel: linkFormat.link?.rel || linkFormat.rel || '',
			target: linkFormat.link?.target || linkFormat.target || '',
			class: linkFormat.link?.class || linkFormat.class || ''
		};

		// console.log( 'attrs values:', attrs );
		
		// Open our dialog
		link.openDialog(attrs).then(data => {
			if (data === null) return; // Cancelled
			
			if (data === false) {
				// Remove link
				quill.format('link', false, 'user');
				return;
			}
			
			if (!data.href) {
				// Empty URL - remove link
				quill.format('link', false, 'user');
				return;
			}
			
			// console.log( 'openDialog with data values:', data );
			// Apply the link with all attributes
			link.applyLinkFormat(quill, {index, length}, data);
		});
	},
	
	/* ----------------------------------------------------------------
	 *  Directly apply link format to avoid [object Object] issue
	 * ---------------------------------------------------------------- */
	applyLinkFormat(quill, range, data) {
		// First remove any existing link
		quill.formatText(range.index, range.length, 'link', false, 'silent');
		
		// Then apply the href as a string first
		quill.formatText(range.index, range.length, 'link', data.href, 'silent');
		
		// Apply additional attributes separately
		if (data.title || data.rel || data.target || data.class) {
			// We need to access the DOM directly to set these attributes
			const domNode = document.querySelector('.ql-editor a[href="' + data.href + '"]');
			if (domNode) {
				if (data.title) domNode.setAttribute('title', data.title);
				if (data.rel) domNode.setAttribute('rel', data.rel);
				if (data.target) domNode.setAttribute('target', data.target);
				if (data.class) domNode.setAttribute('class', data.class);
			}
		}
		
		// Update UI
		quill.update('user');
		
		// console.log('Link applied with direct DOM manipulation');
	},
	
	/* ----------------------------------------------------------------
	 *  Attach our custom handler to all Quill instances
	 * ---------------------------------------------------------------- */
	attachToEditors() {
		// console.log('Attaching link handlers to all editors');
		
		// Find all Quill instances
		document.querySelectorAll('.acf-quill-editor').forEach(editorElement => {
			if (!editorElement.__quill) return;
			
			const quill = editorElement.__quill;
			// console.log('Found Quill instance:', quill);
			
			// Override the toolbar module's link handler
			const toolbar = quill.getModule('toolbar');
			if (toolbar) {
				// console.log('Found toolbar, overriding link handler');
				toolbar.handlers.link = function(value) {
					// console.log('Custom link handler called from toolbar');
					link.toolbarHandler.call(this);
				};
			}
			
			// Also override the keyboard shortcut
			quill.keyboard.addBinding({ key: 'K', shortKey: true }, function(range, context) {
				// console.log('Link keyboard shortcut pressed');
				if (toolbar) {
					link.toolbarHandler.call(toolbar);
					return false;
				}
			});
		});
	},

	/* ----------------------------------------------------------------
	 *  real handler – runs with `this` === toolbar instance
	 * ---------------------------------------------------------------- */
	toolbarHandler() {
		// console.log('toolbarHandler called');
		const quill = this.quill;
		if (!quill) {
			console.error('No quill instance in toolbar');
			return;
		}
		
		const range = quill.getSelection(true);
		if (!range) {
			console.warn('No selection range');
			return;
		}

		// console.log('Getting format at range:', range);
		const format = quill.getFormat(range);
		// console.log('Current format:', format);

		// Get current link attributes
		const linkAttrs = {
			href: format.link?.href || format.link || '',
			title: format.link?.title || '',
			rel: format.link?.rel || '',
			target: format.link?.target || '',
			class: format.link?.class || ''
		};
		
		// console.log('Opening dialog with:', linkAttrs);
		
		link.openDialog(linkAttrs).then(data => {
			// console.log('Dialog returned:', data);
			
			if (data === null) {
				// console.log('Dialog cancelled');
				return; // User cancelled
			}
			
			if (data === false) {
				// console.log('Removing link');
				quill.format('link', false, 'user');
				return;
			}
			
			if (!data.href) {
				// console.log('Empty URL, removing link');
				quill.format('link', false, 'user');
				return;
			}
			
			// console.log('Applying link format:', data);
			link.applyLinkFormat(quill, range, data);
			// console.log('Setting selection after link');
			quill.setSelection(range.index + range.length, 0, 'silent');
		});
	},

	/* ----------------------------------------------------------------
	 *  vanilla-JS modal that returns { href,title,rel,target,class }
	 * ---------------------------------------------------------------- */
	openDialog(initial) {
		// console.log('openDialog called with:', initial);
		
		return new Promise(resolve => {
			// Check if there's an existing modal and remove it first
			const existingModal = document.querySelector('.acf-quill-link-modal');
			if (existingModal) {
				// console.log('Removing existing modal');
				existingModal.remove();
			}

			const wrap = document.createElement('div');
			wrap.className = 'acf-quill-link-modal';
			
			let linkTemplate = acf_quill_field.link_template ?? '';

				linkTemplate = linkTemplate.replace( '{{HREF}}', initial.href );
				linkTemplate = linkTemplate.replace( '{{TITLE}}', initial.title );
				linkTemplate = linkTemplate.replace( '{{CLASS}}', initial.class );
				
				linkTemplate = linkTemplate.replace( '{{TARGET}}', initial.target === '_blank' ? 'checked': '' );

				linkTemplate = linkTemplate.replace( '{{REL}}', initial.rel );

				linkTemplate = linkTemplate.replace( '{{NO_FOLLOW}}', initial.rel?.includes( 'nofollow' ) ? 'checked': '' );
				linkTemplate = linkTemplate.replace( '{{SPONSORED}}', initial.rel?.includes( 'sponsored' ) ? 'checked': '' );

			// return to HTML
			wrap.innerHTML = linkTemplate;

			const form = wrap.querySelector('form');
			const relInput = form.elements.rel;
			const relNofollowCheckbox = form.elements.rel_nofollow;
			const relSponsoredCheckbox = form.elements.rel_sponsored;
			
			// Handle rel checkbox changes
			const updateRelInput = () => {
				let relValues = relInput.value.split(' ').filter(val => 
					val !== 'nofollow' && val !== 'sponsored' && val.trim()
				);
				
				if (relNofollowCheckbox.checked) relValues.push('nofollow');
				if (relSponsoredCheckbox.checked) relValues.push('sponsored');
				
				relInput.value = relValues.join(' ').trim();
			};
			
			relNofollowCheckbox.addEventListener('change', updateRelInput);
			relSponsoredCheckbox.addEventListener('change', updateRelInput);
			
			// Close modal functions
			const close = res => { 
				// console.log('Closing dialog with result:', res);
				wrap.remove(); 
				resolve(res); 
			};

			// Click handlers
			wrap.addEventListener('click', e => {
				if (e.target.dataset.act === 'cancel' || e.target === wrap) {
					close(null);
				} else if (e.target.dataset.act === 'remove') {
					close(false);  // Signal to remove the link
				}
			});

			// Submit handler
			form.addEventListener('submit', e => {
				e.preventDefault();
				const fd = new FormData(form);
				const res = {
					href: fd.get('href').trim(),
					title: fd.get('title').trim(),
					class: fd.get('class').trim()
				};
				
				// Only add rel if it's actually filled
				const rel = fd.get('rel').trim();
				if (rel) {
					res.rel = rel;
				}
				
				// Only add target if checkbox is checked
				if (fd.get('target')) {
					res.target = '_blank';
				}
				
				// console.log('Form submitted with values:', res);
				close(res);
			});

			// console.log('Appending modal to body');
			document.body.appendChild(wrap);
			form.elements.href.focus();
			
			// Initial setup for rel values
			updateRelInput();
		});
	}
};

export { link };