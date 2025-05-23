var loader = {  
	observer: null,
	unsavedChanges: false, // Track if there are unsaved changes

	init: function () {
		const self = this;

		self.initQuillEditors();
		self.observe();
		self.setupUnsavedChangesWarning();
		self.setupSaveListener();
	},

	// Add this new method to set up the beforeunload warning
	setupUnsavedChangesWarning: function() {
		const self = this;
		
		// Add beforeunload event handler for classic editor
		window.addEventListener('beforeunload', function(e) {
			if (self.unsavedChanges) {
				// Standard message for unsaved changes
				const message = 'The changes you made will be lost if you navigate away from this page.';
				e.returnValue = message; // For Chrome
				return message; // For older browsers
			}
		});
	},

	observe: function() {
		const self = this;
		// ⚡ Init Quill on dynamic Gutenberg block insertion
		self.observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				  if (mutation.addedNodes.length > 0) {
					mutation.addedNodes.forEach((node) => {
						  if (node.nodeType === 1) {
							const quillBlocks = node.querySelectorAll?.('.acf-quill-editor');
							if (quillBlocks.length > 0) {
								self.initQuillEditors();
							}
						  }
					});
				  }
			}
		});
		  
		self.observer.observe(document.body, {
			childList: true,
			subtree: true,
		});
	},

	initQuillEditors: function() {
		const self = this;
		//// console.log('Initializing Quill editors');

		document.querySelectorAll('.acf-quill-editor').forEach((el) => {
			if (el.dataset.quillInit === 'true') return;
	
			const textarea = el.nextElementSibling;
			if (!textarea) return;

			const acfQuillFieldInput = textarea.parentElement;

			// Build toolbar container from configuration
			let toolbarContainer = self.buildToolbarFromConfig();

			// Register a custom Break blot for line breaks BEFORE creating Quill instance
			const Embed = Quill.import('blots/embed');
			const Delta = Quill.import('delta');
			
			class LineBreak extends Embed {
				static blotName = 'break';
				static tagName = 'br';
				
				static create() {
					const node = super.create();
					return node;
				}
				
				static formats() {
					return true;
				}
				
				static value() {
					return true;
				}
				
				optimize() {
					super.optimize();
				}
				
				length() {
					return 1;
				}
			}
			
			Quill.register(LineBreak, true);

			// https://quilljs.com/docs/modules/toolbar
			let options = {  
				modules: {
					// syntax: true,
					toolbar: {
						container: toolbarContainer,
						handlers: {
							// Set custom link handler directly here
							'link': function() {
								//// console.log('Link handler called from toolbar config');
								if (window.link && window.link.toolbarHandler) {
									window.link.toolbarHandler.call(this);
								}
							}
						}
					},
					clipboard: {
						matchVisual: false,  // This can help with some whitespace issues
					},
					wpImageToolbar: {
						/* optional hook – will run when user clicks "edit" */
						onEdit(img, blot, index, quillInstance) {
							/* open your wp.media modal here later */
						}
					}
				 },
				theme: 'snow' ,
				placeholder: acf_quill_field.l10n.placeholder,
			};
	
			//// console.log('Creating new Quill instance');
			const quill = new Quill(el, options);
			// Store the instance on the DOM element for later access
			el.__quill = quill;

			// Handle Shift+Enter for line breaks (alternative approach)
			const editorElement = el.querySelector('.ql-editor');
			if (editorElement) {
				editorElement.addEventListener('keydown', function(e) {
					if (e.key === 'Enter' && e.shiftKey) {
						e.preventDefault();
						e.stopPropagation();
						e.stopImmediatePropagation();
						
						const selection = quill.getSelection();
						if (selection) {
							// Check if we're at the end of the document
							const length = quill.getLength();
							const isAtEnd = selection.index >= length - 1;
							
							// Get current line to check if it's empty
							const [line, offset] = quill.getLine(selection.index);
							const lineText = line ? quill.getText(line.offset(), line.length()) : '';
							const isEmptyLine = lineText.trim() === '';
							
							// If we're at the end and the line is empty, don't add anything
							if (isAtEnd && isEmptyLine) {
								return false;
							}
							
							// Insert our custom line break blot
							quill.insertEmbed(selection.index, 'break', true, 'user');
							
							// Move cursor after the line break
							setTimeout(() => {
								quill.setSelection(selection.index + 1, 0, 'user');
							}, 0);
						}
						return false;
					}
				}, true);
			}
			
			// Load content with manual BR handling
			const htmlContent = textarea.value;
			if (htmlContent.trim()) {
				// Pre-process HTML to replace BR tags with placeholder
				let processedHtml = htmlContent.replace(/<br\s*\/?>/gi, '___LINEBREAK___');
				
				// Set the content without BR tags first
				const delta = quill.clipboard.convert({ html: processedHtml });
				quill.setContents(delta, 'silent');
				
				// Now manually replace the placeholders with actual line breaks
				setTimeout(() => {
					const currentContents = quill.getContents();
					const newOps = [];
					
					for (const op of currentContents.ops) {
						if (op.insert && typeof op.insert === 'string' && op.insert.includes('___LINEBREAK___')) {
							const parts = op.insert.split('___LINEBREAK___');
							
							for (let i = 0; i < parts.length; i++) {
								if (parts[i]) {
									newOps.push({ insert: parts[i], attributes: op.attributes });
								}
								if (i < parts.length - 1) {
									newOps.push({ insert: { break: true } });
								}
							}
						} else {
							newOps.push(op);
						}
					}
					
					if (newOps.length > 0) {
						const newDelta = new Delta(newOps);
						quill.setContents(newDelta, 'silent');
					}
				}, 100);
			}

			// Store original text-change handler
			const originalTextChange = quill.emitter.listeners['text-change'];

			// Override text-change to intercept deltas before they're processed
			quill.emitter.listeners['text-change'] = function(delta, oldContents, source) {
				// Only modify user input deltas
				if (source === 'user') {
					// Check if delta contains text insertions
					const modifiedOps = delta.ops.map(op => {
						if (op.insert && typeof op.insert === 'string') {
							// Replace non-breaking spaces with regular spaces in insertions
							op.insert = op.insert.replace(/\u00A0/g, ' ');
						}
						return op;
					});
					
					// Create a new delta with modified operations
					const modifiedDelta = new Delta(modifiedOps);
					
					// Call the original handler with modified delta
					originalTextChange(modifiedDelta, oldContents, source);
				} else {
					// For non-user changes, use original handler
					originalTextChange(delta, oldContents, source);
				}
			};
	
			quill.on('text-change', (delta, oldDelta, source) => {
				// Only mark as changed if this is a real user edit, not loading or silent updates
				if (source !== 'user') {
					// Just update word count for non-user changes
					self.updateWordCount(el, quill);
					return;
				}
				
				let htmlOutput = quill.getSemanticHTML();
				
				// Clean up excessive BR tags
				htmlOutput = htmlOutput.replace(/((?:&nbsp;)*)&nbsp;/g, '$1 ');
				htmlOutput = htmlOutput.replace(/&quot;/g, '"');
				
				// Remove multiple consecutive BR tags anywhere
				htmlOutput = htmlOutput.replace(/<br>\s*<br>/g, '<br>');
				
				// Remove trailing BR tags in paragraphs
				htmlOutput = htmlOutput.replace(/<br>\s*<\/p>/g, '</p>');
				
				// Remove trailing BR tags in headings
				htmlOutput = htmlOutput.replace(/<br>\s*<\/h([1-6])>/g, '</h$1>');
				
				// Remove trailing BR tags in list items
				htmlOutput = htmlOutput.replace(/<br>\s*<\/li>/g, '</li>');
				
				// Remove empty paragraphs at the end
				htmlOutput = htmlOutput.replace(/<p><\/p>$/, '');
				htmlOutput = htmlOutput.replace(/<p><br><\/p>$/, '');
				
				// Only update if content actually changed
				if (textarea.value !== htmlOutput) {
					textarea.value = htmlOutput;
					
					// Update word count when text changes
					self.updateWordCount(el, quill);
					
					// Mark that there are unsaved changes for real user changes
					self.unsavedChanges = true;
					
					// Trigger change event on the textarea to signal WordPress
					self.triggerChange(textarea);
					
					// Only notify Gutenberg if we're actually in Gutenberg and content changed significantly
					if (window.wp && window.wp.data && window.wp.data.select && window.wp.data.select('core/editor')) {
						// We're in Gutenberg - DON'T notify to avoid conflicts
						// Gutenberg will detect changes through other means
					}
				} else {
					// Content didn't change, just update word count
					self.updateWordCount(el, quill);
				}
			});

            // Create and add word count and path containers
            self.createEditorInfoElements(el, acfQuillFieldInput);
            
            // Update word count on initial load
            self.updateWordCount(el, quill);
            
            // Set up selection change tracking for path display
            quill.on('selection-change', function(range, oldRange, source) {
                self.updatePathDisplay(el, quill, range);
            });

			setTimeout(() => {
				self.prepareTooltips(acfQuillFieldInput);
			}, 50);
	
			el.dataset.quillInit = 'true';
		});
		
		// Signal that editors are initialized
		window.acfQuillEditorsLoaded = true;
		document.dispatchEvent(new Event('acf-quill-editors-loaded'));
	},
    
    // New method to trigger change event on textarea
    triggerChange: function(textarea) {
        // Only trigger change events if we're not in Gutenberg
        // Gutenberg has its own change detection that conflicts with ours
        if (!window.wp || !window.wp.data || !window.wp.data.select || !window.wp.data.select('core/editor')) {
            // We're in classic editor - trigger change events normally
            const changeEvent = new Event('change', { bubbles: true });
            textarea.dispatchEvent(changeEvent);
            
            const inputEvent = new Event('input', { bubbles: true });
            textarea.dispatchEvent(inputEvent);
        }
        // In Gutenberg, we skip triggering change events to avoid conflicts
    },
    
    // Notify Gutenberg of changes using the appropriate API
    notifyGutenberg: function() {
        // Only notify if we actually have unsaved changes
        if (!this.unsavedChanges) return;
        
        // Check if we're in Gutenberg editor
        if (window.wp && window.wp.data && window.wp.data.dispatch) {
            try {
                // Mark the post as modified in Gutenberg
                // This is the stable way to mark content as changed across WP versions
                window.wp.data.dispatch('core/editor').editPost({ 
                    modified: true 
                });
            } catch (e) {
                console.warn('Error notifying Gutenberg of changes', e);
            }
        }
    },

    // Create word count and path display elements
    createEditorInfoElements: function(editorElement, parentElement) {
        const self = this;
		const aqfL10N = acf_quill_field.l10n;
        
        // Create container for editor info (word count and path)
        const infoContainer = document.createElement('div');
        infoContainer.className = 'quill-editor-info';
    
        // Create word count element
        const wordCountEl = document.createElement('div');
        wordCountEl.className = 'quill-word-count';
        wordCountEl.textContent = `${ aqfL10N.words.word_count }: 0`;
        
        // Create path display element
        const pathDisplayEl = document.createElement('div');
        pathDisplayEl.className = 'quill-path-display';
        // pathDisplayEl.textContent = `${ aqfL10N.path.path }: `;
        
        // Add elements to container
        infoContainer.appendChild(wordCountEl);
        infoContainer.appendChild(pathDisplayEl);
        
        // Store references to these elements on the editor for easy access
        editorElement.wordCountEl = wordCountEl;
        editorElement.pathDisplayEl = pathDisplayEl;
        
        // Find the appropriate place to insert the info container
        // We want it after the editor but before any other controls
        const editorContainer = editorElement.closest('.acf-quill-field');
        const editorWrapper = editorElement.closest('.acf-input');
        
        if (editorWrapper) {
            // Insert after the editor's container
            editorWrapper.appendChild(infoContainer);
        } else {
            // Fallback - insert after the editor element itself
            editorElement.parentNode.insertBefore(infoContainer, editorElement.nextSibling);
        }
    },

    // Update word count for an editor
    updateWordCount: function(editorElement, quill) {
        if (!editorElement.wordCountEl) return;

		const aqfL10N = acf_quill_field.l10n;
        
        // Get text content
        const text = quill.getText();
        
        // Calculate word count (split by whitespace and filter out empty strings)
        const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
        
        // Update the word count display
        editorElement.wordCountEl.textContent = `${aqfL10N.words.word_count}: ${wordCount}`;
    },

	// Update path display
	updatePathDisplay: function(editorElement, quill, range) {
		if (!editorElement.pathDisplayEl || !range) return;
		
		let path = '';
		const aqfL10N = acf_quill_field.l10n;
		
		try {
			// Get leaf (lowest-level node) at the current position for more accurate path
			const [leaf, offset] = quill.getLeaf(range.index);
			if (!leaf) return;
			
			// Build path by traversing up the DOM
			const pathParts = [];
			
			// Start from the actual DOM node where the cursor is
			let currentNode = leaf.domNode;
			
			// Handle text nodes - start with parent if we're on a text node
			if (currentNode.nodeType === Node.TEXT_NODE) {
				currentNode = currentNode.parentNode;
			}
			
			// Traverse up the DOM tree
			while (currentNode) {
				// Skip text nodes and skip the editor container
				if (currentNode.nodeType === Node.ELEMENT_NODE && 
					!(currentNode.classList && 
					(currentNode.classList.contains('ql-editor') || 
					currentNode.classList.contains('ql-container')))) {
					
					let tagName = currentNode.tagName.toLowerCase();
					let displayName = tagName;
					
					// Special handling for list elements
					if (tagName === 'ol') {
						// Check if this is actually a bullet list
						const listItems = currentNode.querySelectorAll('li');
						const firstLi = listItems[0];

						if (firstLi && firstLi.getAttribute('data-list') === 'bullet') {
							displayName = 'ul';
						}
					}

					// TODO: working proplery for infinite nesting, for now 2nd nesting works
					if( tagName == 'li' && currentNode.classList.value != '' ) {
						if( currentNode.classList.value.includes( 'ql-indent-' ) ) {
							let listType = currentNode.getAttribute( 'data-list' ) == 'bullet' ? 'ul' : 'ol';
							displayName += ` > ${ listType } > li`;
						}
					}
					
					// Check for meaningful classes (non-quill classes)
					const classNames = Array.from( currentNode.classList || [] ).filter( className => 
						! className.startsWith('ql-') && className !== 'ql-editor' &&className !== 'ql-container'
					);
					
					if ( classNames.length > 0 && ! displayName.includes( '.' ) ) {
						displayName += `.${classNames.join( '.' )}`;
					}
					
					pathParts.unshift( displayName );
				}
				
				// Move up to parent
				currentNode = currentNode.parentNode;
				
				// Stop when we reach the editor container
				if (currentNode && currentNode.classList && 
					(currentNode.classList.contains('ql-editor') || 
					currentNode.classList.contains('ql-container'))) {
					break;
				}
			}
			
			// Create the path string
			path = pathParts.join(' > ');
		} catch (e) {
			console.error('Path display error:', e);
			path = aqfL10N.path.not_available;
		}
		
		// Update the path display
		editorElement.pathDisplayEl.textContent = `${aqfL10N.path.path}: ${path || aqfL10N.path.not_available}`;
	},

	prepareTooltips: function( acfQuillFieldInput ) {
		const self = this;
		const aqfL10N = acf_quill_field.l10n.tooltip;

		const elementsToAddTooltip = [
			[ '.ql-bold', aqfL10N.bold ],
			[ '.ql-italic', aqfL10N.italic ],
			[ '.ql-underline', aqfL10N.underline ],
			[ '.ql-strike', aqfL10N.strike ],
			[ '.ql-link', aqfL10N.link ],

			[ '.ql-color', aqfL10N.color ],
			[ '.ql-background', aqfL10N.background ],

			[ '.ql-align[value=""]', aqfL10N.left ],
			[ '.ql-align[value="justify"]', aqfL10N.justify ],
			[ '.ql-align[value="center"]', aqfL10N.center ],
			[ '.ql-align[value="right"]', aqfL10N.right ],

			[ '.ql-list[value="bullet"]', aqfL10N.ul ],
			[ '.ql-list[value="ordered"]', aqfL10N.ol ],

			[ '.ql-indent[value="+1"]', aqfL10N.indent_plus ],
			[ '.ql-indent[value="-1"]', aqfL10N.indent_minus ],

			[ '.ql-script[value="super"]', aqfL10N.script_sup ],
			[ '.ql-script[value="sub"]', aqfL10N.script_sub ],

			[ '.ql-blockquote', aqfL10N.blockquote ],
			[ '.ql-code', aqfL10N.code ],
			[ '.ql-code-block', aqfL10N.code_block ],

			[ '.ql-clean', aqfL10N.clean ],

			[ '.ql-wp-media', aqfL10N.wp_media ],
		]

		elementsToAddTooltip.forEach((item) => {
			self.acfQuillFieldAddTooltip(acfQuillFieldInput.querySelector(item[0]), item[1])
		});
	},

	acfQuillFieldAddTooltip: function(element, text) {
		if (!element) return;
		element.setAttribute('aria-label', text);
		element.setAttribute('data-balloon-pos', 'up');
	},

	buildToolbarFromConfig: function() {
		// Default toolbar if nothing is configured
		const defaultToolbar = [
			[{ 'header': [ 1, 2, 3, 4, 5, 6, false ] }],
			[ 'bold', 'italic', 'underline', 'strike', 'link' ],
			[{ 'color': [] }, { 'background': [] }],
			[{ 'align': ''}, { 'align': 'center'}, {'align': 'right'}, {'align': 'justify'}],
			[{ 'list': 'ordered'}, { 'list': 'bullet' }],
			[{ 'indent': '-1' }, { 'indent': '+1' }],
			[{ 'script': 'super' }, { 'script': 'sub' }],
			[ 'blockquote', 'code' ],
			[ 'code-block' ],
			[ 'clean' ],
			[{ 'wp-media': true }]
		];
		
		// If no config is provided, return default
		if (!window.acf_quill_field || !window.acf_quill_field.toolbar_config) {
			return defaultToolbar;
		}
		
		if (!window.acf_quill_field || !window.acf_quill_field.load_toolbar_config) {
			return defaultToolbar;
		}
		
		// Process the toolbar configuration
		try {
			const config = window.acf_quill_field.toolbar_config;
			const formatOptions = window.acf_quill_field.format_options || {};
			
			// Transform the config into Quill's expected format
			return config.map(group => {
				return group.map(item => {
					// Simple button (bold, italic, etc.)
					if (typeof item === 'string') {
						// Special case for wp-media which needs a boolean value
						if (item === 'wp-media') {
							return { 'wp-media': true };
						}
						
						// Check if this is a format that needs options
						if (formatOptions[item]) {
							// Create object with format options
							const obj = {};
							obj[item] = formatOptions[item];
							return obj;
						}
						
						// Regular button
						return item;
					}
					
					// Item is already an object (custom format)
					return item;
				});
			});
		} catch (e) {
			console.error('Error building toolbar:', e);
			return defaultToolbar;
		}
	},
    
    // Method to reset the unsaved changes flag (call this after saving)
    resetUnsavedChanges: function() {
        this.unsavedChanges = false;
    },
    
    // Setup a listener for save events (both Gutenberg and Classic Editor)
    setupSaveListener: function() {
        const self = this;
        
        // === CLASSIC EDITOR SAVE DETECTION ===
        // Listen for form submission (when user saves/updates post)
        document.addEventListener('submit', function(e) {
            // Check if this is a WordPress admin form (post edit, etc.)
            if (e.target && (e.target.id === 'post' || e.target.classList.contains('wp-admin') || (e.target.action && e.target.action.includes('post.php')))) {
                // console.log('WordPress form submission detected - resetting unsaved changes');
                self.resetUnsavedChanges();
            }
        });
        
        // Listen for save button clicks specifically
        document.addEventListener('click', function(e) {
            // Check for various WordPress save/publish buttons
            if (e.target && (
                e.target.id === 'publish' || 
                e.target.id === 'save-post' || 
                e.target.name === 'save' || 
                e.target.name === 'publish' ||
                e.target.classList.contains('button-primary')
            )) {
                // console.log('WordPress save button clicked - resetting unsaved changes');
                // Small delay to let the save process start
                setTimeout(() => {
                    self.resetUnsavedChanges();
                }, 500);
            }
        });
        
        // === GUTENBERG SAVE DETECTION ===
        // Check if we're in Gutenberg editor
        if (!window.wp || !window.wp.data || !window.wp.data.subscribe) {
            // Not in Gutenberg, skip Gutenberg-specific setup
            // console.log('Gutenberg API not detected, using classic editor save detection only');
            return;
        }
        
        // Reset unsaved changes when page loads (in case of browser back/forward)
        setTimeout(() => {
            self.resetUnsavedChanges();
        }, 1000);
        
        // Wait for Gutenberg to be ready
        const setupListener = function() {
            let wasSaving = false;
            let wasAutosaving = false;
            
            // Subscribe to changes in the editor state
            window.wp.data.subscribe(function() {
                // Make sure editor data store is available
                if (!window.wp.data.select('core/editor')) return;
                
                try {
                    // Use multiple methods to detect saving state
                    const isSaving = window.wp.data.select('core/editor').isSavingPost();
                    const isAutosaving = window.wp.data.select('core/editor').isAutosavingPost();
                    
                    // Detect when any type of save completes
                    if ((wasSaving && !isSaving) || (wasAutosaving && !isAutosaving)) {
                        // Add a longer delay to ensure all async operations complete
                        setTimeout(() => {
                            self.resetUnsavedChanges();
                            // console.log('Gutenberg save completed, unsaved changes reset');
                        }, 1000);
                    }
                    
                    // Update previous states
                    wasSaving = isSaving;
                    wasAutosaving = isAutosaving;
                } catch (e) {
                    console.warn('Error checking save status:', e);
                }
            });
            
            // console.log('Gutenberg save listener set up successfully');
        };
        
        // If editor is already loaded
        if (window.wp.data.select('core/editor')) {
            setupListener();
        } else {
            // Wait for editor to be ready
            const checkEditorReady = setInterval(function() {
                if (window.wp.data.select('core/editor')) {
                    clearInterval(checkEditorReady);
                    setupListener();
                }
            }, 200);
            
            // Don't wait forever - clear interval after 5 seconds
            setTimeout(function() {
                clearInterval(checkEditorReady);
                // console.log('Gave up waiting for editor data store');
            }, 5000);
        }
    }
}

export { loader };