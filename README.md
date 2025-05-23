# Todo

>     // Silence is golden.

# Filters

## Custom options / formatting

```
add_filter( 'acf/quill-field/load_custom_options', '__return_true' );
add_filter( 'acf/quill-field/load_custom_options', '__return_false' );

add_filter( 'acf/quill-field/custom_options', 'acf_quill_field_options_999' );
function acf_quill_field_options_999() {
	return array(
		array(
			'value' => 'somevalue',
			'name' 	=> __( 'Some value', 'text-domain' ),
			'class' => 'somevalue-class'
		),
	);
}
```

## Toolbar options

```
add_filter( 'acf/quill-field/load_toolbar_config', '__return_true' );
add_filter( 'acf/quill-field/load_toolbar_config', '__return_false' );

add_filter( 'acf/quill-field/toolbar_config', 'acf_quill_field_toolbar_999' );
function acf_quill_field_toolbar_999() {
	return array(
		array( array( 'header' => array( 1, 2, 3, 4, 5, 6, false ) ) ),
		array( 'bold', 'italic', 'underline', 'strike', 'link' ),
		array( array( 'color' => array( '#000' ) ), array( 'background' => array( '#000' ) ) ),
		array( array( 'align' => '' ), array( 'align' => 'center' ), array( 'align' => 'right' ), array( 'align' => 'justify' ) ),
		array( array( 'list' => 'ordered' ), array( 'list' => 'bullet' ) ),
		array( array( 'indent' => '-1' ), array( 'indent' => '+1' ) ),
		array( array( 'script' => 'super' ), array( 'script' => 'sub' ) ),
		array( 'blockquote', 'code' ),
		array( 'code-block' ),
		array( 'clean' ),
		array( array( 'wp-media' => true ) ),
	);
}
```

# Known issues

1. quill getSemanticHTML() removes align from LI tags
2. quill getSemanticHTML() breaks spaces https://github.com/slab/quill/issues/4509
3. when editing image, link class not updated when edited