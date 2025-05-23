var WPMediaToolbar = {  
	dataBalloon: 'data-balloon-pos="up"',
	iconList: {
		AlignNone: '<svg viewBox="0 0 18 18"><line class="ql-stroke" x1="15" x2="3" y1="9" y2="9"></line><line class="ql-stroke" x1="15" x2="3" y1="14" y2="14"></line><line class="ql-stroke" x1="15" x2="3" y1="4" y2="4"></line></svg>',
		AlignLeft: '<svg viewBox="0 0 18 18"><line class="ql-stroke" x1="3" x2="15" y1="9" y2="9"></line><line class="ql-stroke" x1="3" x2="13" y1="14" y2="14"></line><line class="ql-stroke" x1="3" x2="9" y1="4" y2="4"></line></svg>',
		AlignCenter: '<svg viewBox="0 0 18 18"><line class="ql-stroke" x1="15" x2="3" y1="9" y2="9"></line><line class="ql-stroke" x1="14" x2="4" y1="14" y2="14"></line><line class="ql-stroke" x1="12" x2="6" y1="4" y2="4"></line></svg>',
		AlignRight: '<svg viewBox="0 0 18 18"><line class="ql-stroke" x1="15" x2="3" y1="9" y2="9"></line><line class="ql-stroke" x1="15" x2="5" y1="14" y2="14"></line><line class="ql-stroke" x1="15" x2="9" y1="4" y2="4"></line></svg>',
		Edit: '<svg viewBox="0 0 24 24" width="18" height="18" color="#000000" fill="none"> <path class="ql-stroke" d="M3.5 17.1213V20.5H6.87868C7.2765 20.5 7.65804 20.342 7.93934 20.0607L20.06 7.93934C20.6458 7.35355 20.6458 6.40381 20.06 5.81802L18.1813 3.93934C17.5955 3.35355 16.6458 3.35355 16.06 3.93934L3.93934 16.0607C3.65804 16.342 3.5 16.7235 3.5 17.1213Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /> <path class="ql-stroke" d="M13.5002 6.49902L17.5002 10.499" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /> </svg>',
		Remove: '<svg viewBox="0 0 24 24" width="18" height="18" color="#000000" fill="none"> <path class="ql-stroke" d="M19.5 5.5L18.6139 20.121C18.5499 21.1766 17.6751 22 16.6175 22H7.38246C6.32488 22 5.4501 21.1766 5.38612 20.121L4.5 5.5" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> <path class="ql-stroke" d="M3 5.5H8M21 5.5H16M16 5.5L14.7597 2.60608C14.6022 2.2384 14.2406 2 13.8406 2H10.1594C9.75937 2 9.39783 2.2384 9.24025 2.60608L8 5.5M16 5.5H8" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> <path class="ql-stroke" d="M9.5 16.5L9.5 10.5" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> <path class="ql-stroke" d="M14.5 16.5L14.5 10.5" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>'
	},

	init: function () {
		const self 		= this;
		const Tooltip   = Quill.import( 'ui/tooltip' );

		class WPImageToolbar extends Tooltip {
			constructor(quill, options = {}) {
				// Tooltip expects (quill, boundsElement) as arguments
				super(quill, options.bounds || quill.root.parentNode);

				/* ----------------------------------------------------------
				* use this.root, because Tooltip created it
				* --------------------------------------------------------- */
				this.root.classList.add( 'ql-wpmedia-toolbar' ); // 'ql-tooltip' already set
				this.root.innerHTML = `
					<span class="ql-formats">
						<button class="ql-align" aria-label="${ acf_quill_field.l10n.tooltip.none }" ${ self.dataBalloon } data-align="" title="None">
							${self.iconList.AlignNone}
						</button>
						<button class="ql-align" aria-label="${ acf_quill_field.l10n.tooltip.left }" ${ self.dataBalloon } data-align="left" title="Left">
							${self.iconList.AlignLeft}
						</button>
						<button class="ql-align" aria-label="${ acf_quill_field.l10n.tooltip.center }" ${ self.dataBalloon } data-align="center" title="Center">
							${self.iconList.AlignCenter}
						</button>
						<button class="ql-align" aria-label="${ acf_quill_field.l10n.tooltip.right }" ${ self.dataBalloon } data-align="right" title="Right">
							${self.iconList.AlignRight}
						</button>
					</span>
					<button class="edit" aria-label="${ acf_quill_field.l10n.tooltip.edit }" ${ self.dataBalloon } title="Edit">
						${self.iconList.Edit}
					</button>
					<button class="remove" aria-label="${ acf_quill_field.l10n.tooltip.delete }" ${ self.dataBalloon } title="Remove">
						${self.iconList.Remove}
					</button>
				`;

				/* ----------------------------------------------------------
				* cache buttons
				* --------------------------------------------------------- */
				this.alignBtns = Array.from(this.root.querySelectorAll('.ql-align'));
				const btnEdit   = this.root.querySelector('.edit');
				const btnRemove = this.root.querySelector('.remove');

				/* ----------------------------------------------------------
				* Listen for clicks inside the editor
				* --------------------------------------------------------- */
				quill.root.addEventListener('click', e => {
					const img = e.target.closest('img[class*="wp-image-"]');
					if (img) {
						this.img   = img;
						this.blot  = Quill.find(img);
						this.index = this.blot.offset(quill.scroll);
						this._updateActiveAlign();
						this._position();
						
						self.hideLinkToolTip();
						this.show();
						requestAnimationFrame(() => this._position());
					} else {
						this.hide();
						self.hideMediaFocus( document.querySelector( 'img.in-focus' ) );
					}
				});

				/* ----------------------------------------------------------
				* Alignment buttons
				* --------------------------------------------------------- */
				this.alignBtns.forEach(btn => {
					btn.addEventListener('click', e => {
					e.preventDefault();
					const value   = btn.dataset.align || false;
					const classes = ['alignnone','alignleft','aligncenter','alignright'];

					classes.forEach(c => this.img.classList.remove(c));
						this.img.classList.add(value ? `align${value}` : 'alignnone');
						quill.formatLine(this.index, 1, { align: value || false }, 'user');
						this._updateActiveAlign();
					});
				});

				/* ----------------------------------------------------------
				* Remove button
				* --------------------------------------------------------- */
				btnRemove.addEventListener('click', e => {
					e.preventDefault();
					quill.deleteText(this.index, 2, 'user');      // blot + newline
					this.hide();
				});
			
				/* ----------------------------------------------------------
				* Edit button
				* --------------------------------------------------------- */
				btnEdit.addEventListener('click', e => {
					e.preventDefault();
					// native “Image Details” modal + live replace
					self.openImageDetails( this.img, this.blot, this.index, quill );
					this.hide();
				});

				/* ----------------------------------------------------------
				* hide the image-toolbar when user clicks anywhere outside
				* --------------------------------------------------------- */
				document.addEventListener( 'click', e => {
					if ( this.root.style.display !== 'none' && ! quill.root.contains( e.target ) && ( e.target ) ) {
						this.hide();
						self.hideMediaFocus( document.querySelector( 'img.in-focus' ) );
					}
				}, true );

				/* ----------------------------------------------------------
				* Keep tooltip stuck to image while scrolling / resizing
				* --------------------------------------------------------- */
				const reposition = () => this.img && this.root.style.display !== 'none' && this._position();

				quill.root.parentNode.addEventListener('scroll', reposition, { passive:true });
				window.addEventListener('scroll', reposition, { passive:true });
				window.addEventListener('resize', reposition);
				quill.on('text-change', reposition);
			}

			/* ----------------------------------------------------------
			* Make the correct alignment button look “pressed”
			* --------------------------------------------------------- */
			_updateActiveAlign() {
				const current = (/align(left|center|right)/.exec(this.img.className)||[])[1] || '';
				this.alignBtns.forEach(btn => btn.classList.toggle('ql-active', btn.dataset.align === current));
			}

			/* ----------------------------------------------------------
			* geometry
			* --------------------------------------------------------- */
			_position() {
				const imgRect    = this.img.getBoundingClientRect();
				const boundsRect = this.quill.root.parentNode.getBoundingClientRect();
			
				this.root.style.left = imgRect.left - boundsRect.left + imgRect.width / 2 - this.root.offsetWidth / 2 + 'px';
				this.root.style.top  = imgRect.top  - boundsRect.top  - this.root.offsetHeight - 10 + 'px';

				if( ! this.quill.root.parentNode.querySelector( '.ql-wpmedia-toolbar' ).classList.contains( 'ql-hidden' ) ) {
					this.img.classList.add( 'in-focus' );
				}
			}
		}

		/* ----------------------------------------------------------------
		* Register the module so Quill can load it with modules:{…}
		* ---------------------------------------------------------------- */
		Quill.register( 'modules/wpImageToolbar', WPImageToolbar );
	},

	hideLinkToolTip: function () {
		const elements = document.querySelectorAll( '.ql-tooltip.ql-flip:not( .ql-hidden )' );
		elements.forEach( item => {
			item.classList.add( 'ql-hidden' );
		});
	},

	hideMediaFocus: function ( element ) {
		if( ! element ) {
			return false;
		}
		
		element.classList.remove( 'in-focus' );
	},
	
	hideMediaTooltip: function () {
		const elements = document.querySelectorAll( '.ql-tooltip.ql-flip:not( .ql-hidden )' );
		elements.forEach( item => {
			item.classList.add( 'ql-hidden' );
		});
	},

	/**
	 * Extract the numeric ID that follows “wp-image-”.
	 * @param {string} str - any input string
	 * @returns {number}  - the found ID, or 0 if none
	 */
	getWpImageId: function (str) {
		const match = str.match(/wp-image-(\d+)/);   // look for “wp-image-<digits>”
		return match ? Number( match[1]) : 0;
	},

	openImageDetails: function(imgNode, blot, blotIndex, quill) {
		const self = this;
	
		// 1. Get current attachment ID from the class
		const id = self.getWpImageId(imgNode.classList.value);
	
		if (!id) {
			return;
		}
	
		// 2. Extract existing attributes from the image node
		const currentAttrs = {
			url: imgNode.getAttribute('src') || '',
			alt: imgNode.getAttribute('alt') || '',
			title: imgNode.getAttribute('title') || '',
			width: imgNode.getAttribute('width') || '',
			height: imgNode.getAttribute('height') || '',
			extraClasses: self.getExtraClasses(imgNode.classList.value),
		};
	
		// 3. Check if image is inside a link
		const linkAttrs = self.getLinkAttributes(imgNode, quill);
		
		// 4. Determine current alignment
		const alignMatch = imgNode.className.match(/align(left|right|center|none)/);
		const align = alignMatch ? alignMatch[1] : 'none';
		
		// 5. Determine current size
		const sizeMatch = imgNode.className.match(/size-([^\s]+)/);
		const size = sizeMatch ? sizeMatch[1] : 'full';
	
		// 6. Fetch the attachment from WordPress media library
		const attachment = wp.media.attachment(id);
	
		attachment.fetch().done(() => {
			// Create a frame for the image details
			const frame = wp.media({
				frame: 'image',
				state: 'image-details',
				editing: true,
				multiple: false,
				metadata: {
					attachment_id: id,
					url: currentAttrs.url,
					alt: currentAttrs.alt,
					title: currentAttrs.title,
					caption: currentAttrs.title, // Use title as caption if available
					align: align,
					size: size,
					width: currentAttrs.width,
					height: currentAttrs.height,
					extraClasses: currentAttrs.extraClasses, // Add extra classes to metadata
					// Pass link settings if available
					linkUrl: linkAttrs.url || '',
					linkTarget: linkAttrs.target ? '_blank' : '',
					linkRel: linkAttrs.rel || '',
					linkClass: linkAttrs.class || ''
				}
			});
	
			frame.$el.addClass('acf-quill-field-edit-media');
	
			// After frame is open, we need to set the advanced field values that aren't 
			// automatically populated from metadata
			frame.on('open', function() {
				// Wait a moment for the frame to fully initialize
				setTimeout(function() {
					try {
						// Target new tab checkbox if we have a link with target="_blank"
						if (linkAttrs.target === '_blank') {
							const targetCheckbox = frame.$el.find('input[type="checkbox"][data-setting="linkTargetBlank"]');
							if (targetCheckbox.length) {
								targetCheckbox.prop('checked', true).trigger('change');
							}
						}
	
						// Set CSS classes for the image
						if (currentAttrs.extraClasses) {
							const extraClassesInput = frame.$el.find('input[data-setting="extraClasses"]');
							if (extraClassesInput.length) {
								extraClassesInput.val(currentAttrs.extraClasses).trigger('change');
							}
						}
	
						// Set link CSS class - try multiple selectors as WordPress might use different field names
						if (linkAttrs.class) {
							// Try different possible selectors for the link class field
							const possibleSelectors = [
								'input[data-setting="linkClass"]',
								'input[data-setting="linkClassName"]',
								'input[name="linkClass"]',
								'input.link-class',
								'input.link-class-name',
								'input[id*="linkclass"]',
								'input[id*="link-class"]'
							];
							
							let linkClassInput = null;
							
							// Try each selector until we find the field
							for (const selector of possibleSelectors) {
								const input = frame.$el.find(selector);
								if (input.length) {
									linkClassInput = input;
									break;
								}
							}
							
							// If found, set the value
							if (linkClassInput) {
								linkClassInput.val(linkAttrs.class).trigger('change');
								console.log('Set link class to', linkAttrs.class);
							} else {
								// If we can't find the field, try setting it on the model directly
								if (frame.state && frame.state().props) {
									frame.state().props.set('linkClass', linkAttrs.class);
									console.log('Set link class on model to', linkAttrs.class);
								}
							}
						}
	
						// Set link title/title attribute
						if (linkAttrs.title) {
							const linkTitleInput = frame.$el.find('input[data-setting="linkTitle"]');
							if (linkTitleInput.length) {
								linkTitleInput.val(linkAttrs.title).trigger('change');
							}
						}
	
						// Set rel attribute
						if (linkAttrs.rel) {
							const relInput = frame.$el.find('input[data-setting="linkRel"]');
							if (relInput.length) {
								relInput.val(linkAttrs.rel).trigger('change');
							}
						}
					} catch (e) {
						console.error('Error setting advanced image attributes:', e);
					}
				}, 100);
			});
	
			/* ------------------------------------------------------------------
			* When the user clicks "Update" the frame passes a PostImage JSON
			* ----------------------------------------------------------------- */
			frame.on('update', (data) => {
				console.log('Media frame update data:', data);
				
				var sizes = frame.state().attributes.image.attachment.attributes.sizes;
				var sizeType = data.size ? data.size : 'thumbnail';
				
				var width = data.width ? data.width : sizes.thumbnail.width;
				width = data.customWidth ? data.customWidth : width;
				
				var height = data.height ? data.height : sizes.thumbnail.height;
				height = data.customheight ? data.customheight : height;
	
				// Get extraClasses from the frame's advanced settings
				// We check both the data object and try to get from the frame UI
				var extraClass = '';
				
				// First check if it's in the data object
				if (data.extraClasses) {
					extraClass = data.extraClasses;
				} 
				// Then try to get from the form in the frame if not in data
				else if (!extraClass) {
					const extraClassesInput = frame.$el.find('input[data-setting="extraClasses"]');
					if (extraClassesInput.length) {
						extraClass = extraClassesInput.val() || '';
					} 
					// Fallback to current extra classes if we couldn't get from form
					else if (currentAttrs.extraClasses) {
						extraClass = currentAttrs.extraClasses;
					}
				}
	
				/* --------------------------------------------------
				* 1. Build the attribute set for our wpimage blot
				* ------------------------------------------------- */
				const attrs = {
					src: data.url,
					width: width,
					height: height,
					alt: data.alt || '',
					title: data.caption || '',
					class: `align${data.align || 'none'} size-${sizeType} wp-image-${data.attachment_id} ${extraClass}`.trim(),
				};
	
				/* --------------------------------------------------
				* 2. Replace the old blot with a fresh one
				* ------------------------------------------------- */
				const newBlot = blot.replaceWith('wpimage', attrs);
	
				/* --------------------------------------------------
				* 3. Apply alignment + link using Quill formats
				* ------------------------------------------------- */
				const link = data.linkUrl && data.linkUrl !== 'none' ? data.linkUrl : false;
	
				quill.formatLine(blotIndex, 1, { align: data.align || false }, 'silent');
	
				// Apply the link with additional attributes if available
				if (link) {
					// Get link target setting directly from the form if not in data
					let linkTarget = '';
					if (data.linkTargetBlank || data.linkTarget === '_blank') {
						linkTarget = '_blank';
					} else {
						const targetCheckbox = frame.$el.find('input[type="checkbox"][data-setting="linkTargetBlank"]');
						if (targetCheckbox.length && targetCheckbox.is(':checked')) {
							linkTarget = '_blank';
						}
					}
	
					// Try multiple ways to get the link class
					let linkClass = '';
					
					// 1. Check direct property
					if (data.linkClass) {
						linkClass = data.linkClass;
					} 
					// 2. Check alternative property names
					else if (data.linkClassName) {
						linkClass = data.linkClassName;
					}
					// 3. Try to grab from the UI if still not found
					else {
						// Try different possible selectors
						const possibleSelectors = [
							'input[data-setting="linkClass"]',
							'input[data-setting="linkClassName"]',
							'input[name="linkClass"]',
							'input.link-class',
							'input.link-class-name',
							'input[id*="linkclass"]',
							'input[id*="link-class"]'
						];
						
						for (const selector of possibleSelectors) {
							const input = frame.$el.find(selector);
							if (input.length) {
								linkClass = input.val() || '';
								break;
							}
						}
					}
					
					// 4. Fallback to original class if we still don't have it
					if (!linkClass && linkAttrs.class) {
						linkClass = linkAttrs.class;
					}
					
					console.log('Final link class value:', linkClass);
	
					// Get link rel directly from the form if not in data
					let linkRel = data.linkRel || '';
					if (!linkRel) {
						const relInput = frame.$el.find('input[data-setting="linkRel"]');
						if (relInput.length) {
							linkRel = relInput.val() || '';
						} else if (linkAttrs.rel) {
							linkRel = linkAttrs.rel;
						}
					}
	
					// Get link title directly from the form if not in data
					let linkTitle = data.linkTitle || '';
					if (!linkTitle) {
						const linkTitleInput = frame.$el.find('input[data-setting="linkTitle"]');
						if (linkTitleInput.length) {
							linkTitle = linkTitleInput.val() || '';
						} else if (linkAttrs.title) {
							linkTitle = linkAttrs.title;
						}
					}
	
					const linkData = {
						href: link,
						title: linkTitle,
						rel: linkRel,
						target: linkTarget,
						class: linkClass
					};
					
					console.log('Applying link with data:', linkData);
					
					// If we have the link module available, use it to apply the link format
					if (window.link && window.link.applyLinkFormat) {
						window.link.applyLinkFormat(quill, {index: blotIndex, length: 1}, linkData);
					} else {
						// Fallback to basic link format
						quill.formatText(blotIndex, 1, { link }, 'silent');
					}
				} else {
					// Remove link if previously existed
					quill.formatText(blotIndex, 1, { link: false }, 'silent');
				}
	
				/* caret back after image */
				quill.setSelection(blotIndex + 1, 0, 'silent');
				quill.update('user');
			});
		
			frame.open();
		});
	},
	
	/**
	 * Extract extra classes from the image class attribute
	 * (excludes WordPress-specific classes like alignleft, size-medium, wp-image-123)
	 * @param {string} classString - The class attribute value
	 * @returns {string} - Extra classes not related to WordPress image functionality
	 */
	getExtraClasses: function(classString) {
		if (!classString) return '';
		
		// Split into array of classes
		const classes = classString.split(/\s+/);
		
		// Filter out WordPress-specific classes
		const extraClasses = classes.filter(cls => {
			return !cls.match(/^align(left|right|center|none)$/) && // alignment classes
				!cls.match(/^size-/) && // size classes
				!cls.match(/^wp-image-\d+$/); // wp-image ID classes
		});
		
		return extraClasses.join(' ');
	},
	
	/**
	 * Get link attributes if the image is wrapped in a link
	 * @param {HTMLElement} imgNode - The image DOM node
	 * @param {Quill} quill - The Quill instance
	 * @returns {Object} - Link attributes (url, target, rel, class)
	 */
	getLinkAttributes: function(imgNode, quill) {
		// Default empty link attributes
		const linkAttrs = {
			url: '',
			target: '',
			rel: '',
			class: ''
		};
		
		try {
			// Get the Quill Blot for the image
			const imgBlot = Quill.find(imgNode);
			if (!imgBlot) return linkAttrs;
			
			// Get the image position in the document
			const index = imgBlot.offset(quill.scroll);
			if (index === undefined) return linkAttrs;
			
			// Get the formats at this position - this will include any link format
			const formats = quill.getFormat(index, 1);
			
			// Check if there's a link format
			if (formats.link) {
				// Handle link format being either an object or a string
				if (typeof formats.link === 'string') {
					linkAttrs.url = formats.link;
				} else if (typeof formats.link === 'object') {
					linkAttrs.url = formats.link.href || formats.link;
					linkAttrs.target = formats.link.target || '';
					linkAttrs.rel = formats.link.rel || '';
					linkAttrs.class = formats.link.class || '';
				}
			}
		} catch (e) {
			console.error('Error getting link attributes:', e);
		}
		
		return linkAttrs;
	}
}

export { WPMediaToolbar };