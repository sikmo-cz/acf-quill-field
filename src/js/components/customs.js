import { loader } from './loader.js';

/**
 * Custom inline formatting for QuillJS
 * Adds a dropdown with custom formatting options from acf_quill_field.custom_options
 */
var customs = {
    init: function() {
        const self = this;

		if( acf_quill_field.load_custom_options == false ) {
			return false;
		}
        
        // Register custom inline blot when Quill is available
        if (typeof Quill !== 'undefined') {
            self.registerCustomInlineBlot();
        } else {
            // Wait for Quill to be available
            document.addEventListener('DOMContentLoaded', () => {
                if (typeof Quill !== 'undefined') {
                    self.registerCustomInlineBlot();
                } else {
                    console.warn('Quill not found. Custom inline formatting will not be available.');
                }
            });
        }
    },

    registerCustomInlineBlot: function() {
        const self = this;
        
        // Get required Quill classes
        const Inline = Quill.import('blots/inline');
        
        // Create custom blot class
        class CustomInlineBlot extends Inline {
            static create(value) {
                let node = super.create();
                
                // Set the data-value attribute
                node.setAttribute('data-value', value);
                
                // Find matching custom option to get the class
                if (window.acf_quill_field && window.acf_quill_field.custom_options) {
                    const option = window.acf_quill_field.custom_options.find(opt => opt.value === value);
                    if (option && option.class) {
                        node.classList.add(option.class);
                    }
                }
                
                return node;
            }
            
            static formats(node) {
                return node.getAttribute('data-value');
            }
        }
        
        // Register blot name and tag
        CustomInlineBlot.blotName = 'custom-inline';
        CustomInlineBlot.tagName = 'span';
        
        // Register with Quill
        Quill.register(CustomInlineBlot);
        
        // Hook into loader's initQuillEditors to modify toolbar options
        self.extendLoaderInitQuillEditors();
    },
    
    extendLoaderInitQuillEditors: function() {
        const self = this;
        
        // Override the existing initQuillEditors method
        const originalInitQuillEditors = loader.initQuillEditors;
        
        // We're going to replace the original method with our own version
        loader.initQuillEditors = function() {
            // Call the original function implementation first to setup basic editors
            originalInitQuillEditors.call(this);
            
            // Now enhance the editors with our custom format
            document.querySelectorAll('.acf-quill-editor').forEach((el) => {
                // Skip already enhanced editors
                if (el.dataset.customFormatInit === 'true') return;
                
                // Get the Quill instance that was created by the original function
                const quill = el.__quill;
                if (!quill) return;
                
                // Make sure we have custom options available
                if (!window.acf_quill_field || !window.acf_quill_field.custom_options || 
                    window.acf_quill_field.custom_options.length === 0) {
                    return;
                }
                
                // Register Format Button
                // We need to manually create the buttons since using the 
                // toolbar config alone isn't working correctly
                const toolbar = quill.getModule('toolbar');
                if (!toolbar) return;
                
                // Create a custom dropdown format button
                const formatGroup = document.createElement('span');
                formatGroup.className = 'ql-formats';
                
                const customSelect = document.createElement('select');
                customSelect.className = 'ql-custom-inline';
                
                // Add empty default option
                const emptyOption = document.createElement('option');
                emptyOption.value = '';
                emptyOption.text = 'Format...';
                emptyOption.selected = true;
                customSelect.appendChild(emptyOption);
                
                // Add "Remove Format" option
                const removeOption = document.createElement('option');
                removeOption.value = 'remove';
                removeOption.text = acf_quill_field.l10n.tooltip.remove_format;
                customSelect.appendChild(removeOption);
                
                // Add all custom format options
                window.acf_quill_field.custom_options.forEach(option => {
                    const optElement = document.createElement('option');
                    optElement.value = option.value;
                    optElement.text = option.name;
                    customSelect.appendChild(optElement);
                });
                
                // Add change handler
                customSelect.addEventListener('change', function(e) {
                    const value = e.target.value;
                    const range = quill.getSelection(true);
                    
                    if (range && range.length > 0) {
                        if (value === '' || value === 'remove') {
                            // Remove only our custom format
                            quill.formatText(range.index, range.length, 'custom-inline', false);
                        } else {
                            quill.formatText(range.index, range.length, 'custom-inline', value);
                        }
                    }
                    
                    // Reset dropdown to default after applying
                    setTimeout(() => {
                        customSelect.value = '';
                    }, 10);
                });
                
                formatGroup.appendChild(customSelect);
                
                // Find the toolbar container and add our button
				const toolbarContainer = el.closest( '.acf-field[data-type="quill"]' ).querySelector('.ql-toolbar');
                if (toolbarContainer) {
                    // Find the wp-media button to insert before it
                    const wpMediaButtonContainer = toolbarContainer.querySelector('.ql-wp-media').closest('.ql-formats');
                    
                    if (wpMediaButtonContainer) {
                        // Insert our format button before the wp-media button
                        toolbarContainer.insertBefore(formatGroup, wpMediaButtonContainer);
                    } else {
                        // Fallback - just append to the toolbar
                        toolbarContainer.appendChild(formatGroup);
                    }
                    
                    // Add tooltip
                    if (window.acf_quill_field && window.acf_quill_field.l10n && window.acf_quill_field.l10n.tooltip) {
                        this.acfQuillFieldAddTooltip(customSelect, acf_quill_field.l10n.tooltip.custom_format);
                    }
                }
                
                // Mark this editor as enhanced
                el.dataset.customFormatInit = 'true';
            });
        };
    },
};

export { customs };