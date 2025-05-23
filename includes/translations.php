<?php

	defined( 'ABSPATH' ) || exit;
	
	return array(
		'placeholder' 	=> __( 'write something beatifull', 'acffqe' ),
		'tooltip' 		=> array(
			// IMAGE TOOLBAR
			'left' 			=> __( 'Align left', 'acffqe' ),
			'center' 		=> __( 'Align center', 'acffqe' ),
			'right' 		=> __( 'Align right', 'acffqe' ),
			'none' 			=> __( 'Remove align', 'acffqe' ),
			'edit' 			=> __( 'Edit image', 'acffqe' ),
			'delete' 		=> __( 'Delete image', 'acffqe' ),

			// GENERAL TOOLBAR
			'bold' 			=> __( 'Bold', 'acffqe' ),
			'italic' 		=> __( 'Italic', 'acffqe' ),
			'underline' 	=> __( 'Underline', 'acffqe' ),
			'strike' 		=> __( 'Strike', 'acffqe' ),
			'link' 			=> __( 'Create link', 'acffqe' ),

			'color' 		=> __( 'Color', 'acffqe' ),
			'background' 	=> __( 'Background color', 'acffqe' ),

			'justify' 		=> __( 'Align to block', 'acffqe' ),

			'ul' 			=> __( 'Bullet list', 'acffqe' ),
			'ol' 			=> __( 'Numbered list', 'acffqe' ),

			'indent_plus' 	=> __( 'Indent +', 'acffqe' ),
			'indent_minus' 	=> __( 'Indent -', 'acffqe' ),

			'script_sup' 	=> __( 'Top index', 'acffqe' ),
			'script_sub' 	=> __( 'Bottom index', 'acffqe' ),

			'blockquote' 	=> __( 'Quote', 'acffqe' ),
			'code' 			=> __( 'Code inline', 'acffqe' ),
			'code_block' 	=> __( 'Code block', 'acffqe' ),

			'clean' 		=> __( 'Remove formatting', 'acffqe' ),

			'wp_media' 		=> __( 'Select an image from WP Media', 'acffqe' ),

			// link
			'new_tab'		=> __( 'opens in new tab', 'acffqe' ),

			// CUSTOM OPTIONS	
			'custom_format'	=> __( 'Custom Format', 'acffqe' ),
			'remove_format'	=> __( 'Remove Format', 'acffqe' ),
		),
		'path' => array(
			'path' 			=> __( 'Path', 'acffqe' ),
			'none' 			=> __( 'None', 'acffqe' ),
			'not_available' => __( 'Path not available', 'acffqe' ),
		),
		'words' => array(
			'word_count' => __( 'Word count', 'acffqe' ),
		),
		'changes' => array(
			'beforeunload' => __( 'The changes you made will be lost if you navigate away from this page.', 'acffqe' ),
		)
	);