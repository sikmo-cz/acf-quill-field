<?php

	/**
	 * ---------------------------------------------------------------------------------
	 * 1. Activation-time dependency check
	 * ---------------------------------------------------------------------------------
	 */
	function acffqe_plugin_activation_check() {
		// ACF and ACF Pro both load the main \ACF class very early.
		if ( ! class_exists( 'ACF', false ) ) {

			// “plugin.php” holds deactivate_plugins(); load it if it’s not already.
			if ( ! function_exists( 'deactivate_plugins' ) ) {
				require_once ABSPATH . 'wp-admin/includes/plugin.php';
			}

			deactivate_plugins( plugin_basename( ACFFQE_FILE ) ); // Self-deactivate.

			/* translators: 1: Opening <strong> tag, 2: closing </strong> tag. */
			$message = sprintf(
				esc_html__( 
					'%1$sACF Field: Quill Editor%2$s requires the Advanced Custom Fields (free or Pro) plugin. Please install & activate ACF, then retry.', 'acffqe' 
				),
				'<strong>',
				'</strong>'
			);

			// wp_die() shows the message during the failed activation attempt.
			wp_die( $message, esc_html__( 'Plugin dependency check failed', 'acffqe' ), array( 'back_link' => true ) );
		}
	}

	register_activation_hook( ACFFQE_FILE, 'acffqe_plugin_activation_check' );

	/**
	 * ---------------------------------------------------------------------------------
	 * 2. Run-time watchdog (fires on every admin-page load)
	 * ---------------------------------------------------------------------------------
	 *
	 *   • If ACF is missing AND the current user can activate plugins,
	 *     deactivate this plugin and show a dismissible error notice.
	 */
	function acffqe_run_time_check() {

		if ( class_exists( 'ACF', false ) ) {
			return; // All good - ACF is present.
		}

		// Only let privileged users see the notice/deactivation.
		if ( ! current_user_can( 'activate_plugins' ) ) {
			return;
		}

		// Deactivate (again, include plugin.php if needed).
		if ( ! function_exists( 'deactivate_plugins' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}
		
		deactivate_plugins( plugin_basename( ACFFQE_FILE ) );

		// Queue the admin-notice.
		add_action(
			'admin_notices',
			static function () {
				echo '<div class="notice notice-error is-dismissible"><p>';
				esc_html_e( 'ACF Field: Quill Editor has been deactivated because Advanced Custom Fields (ACF) is not active. Please activate ACF and then reactivate ACF Field: Quill Editor.', 'acffqe' );
				echo '</p></div>';
			}
		);
	}
	add_action( 'admin_init', 'acffqe_run_time_check' );