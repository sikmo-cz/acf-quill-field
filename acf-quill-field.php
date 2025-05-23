<?php
	/*
	 * Plugin Name: 	ACF Field: Quill Editor
	 * Plugin URI: 		https://www.sikmo.cz
	 * Description: 	QuilJS WYSIWYG editor instead of old TinyMCE
	 * Version: 		0.0.2
	 * Author: 			šikmo.cz / Pavel Mareš
	 * Author URI: 		https://www.sikmo.cz
	 * Text Domain:		acffqe
 	 * Domain Path:		/languages
	*/

	defined('ABSPATH') || exit;

	define( 'ACFFQE_VERSION', '0.0.2' );

	define( 'ACFFQE_FILE', __FILE__ );
	define( 'ACFFQE_PATH', __DIR__ );
	define( 'ACFFQE_PATH_INCLUDES', __DIR__ . '/includes' );
	define( 'ACFFQE_PATH_URI', plugin_dir_url( __FILE__ ) );
	define( 'ACFFQE_PATH_URI_DIST', ACFFQE_PATH_URI . 'dist/' );

	include_once ACFFQE_PATH_INCLUDES . '/activation.php';

	add_action( 'acf/include_field_types', function () {
		include_once ACFFQE_PATH_INCLUDES . '/field.php';
	});