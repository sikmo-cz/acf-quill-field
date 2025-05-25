<?php
	/*
	 * Plugin Name:		ACF Field: Quill Editor
	 * Plugin URI:		https://github.com/sikmo-cz/acf-quill-field
	 * Description:		QuilJS WYSIWYG editor instead of old TinyMCE
	 * Version:			0.0.3
	 * Author:			šikmo.cz / Pavel Mareš
	 * Author URI:		https://www.sikmo.cz
	 * Text Domain:		acffqe
 	 * Domain Path:		/languages
	 * GitHub Plugin URI: sikmo-cz/acf-quill-field
	 * Primary Branch: main
	*/

	defined( 'ABSPATH' ) || exit;

	define( 'ACFFQE_VERSION', '0.0.3' );

	define( 'ACFFQE_FILE', __FILE__ );
	define( 'ACFFQE_PATH', __DIR__ );
	define( 'ACFFQE_PATH_INCLUDES', __DIR__ . '/includes' );
	define( 'ACFFQE_PATH_URI', plugin_dir_url( __FILE__ ) );
	define( 'ACFFQE_PATH_URI_DIST', ACFFQE_PATH_URI . 'dist/' );

	// Include files
	include_once ACFFQE_PATH_INCLUDES . '/activation.php';
	include_once ACFFQE_PATH_INCLUDES . '/updater.php';

	// Initialize GitHub updater
	if (is_admin()) {
		new ACFFQE_GitHub_Updater(
			__FILE__,
			'sikmo-cz',           // GitHub username
			'acf-quill-field',    // GitHub repository name
			''                    // GitHub access token (optional, leave empty for public repos)
		);
	}

	add_action( 'acf/include_field_types', function () {
		include_once ACFFQE_PATH_INCLUDES . '/field.php';
	});