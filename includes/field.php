<?php

	defined('ABSPATH') || exit;

	class acf_field_quill extends acf_field {

		function initialize() {
			$this->name 	= 'quill';
			$this->label 	= __( 'Quill Editor', 'acffqe' );
			$this->category = 'content';
		}

		function render_field($field) {
			$field_id 		= esc_attr( $field[ 'id' ] );
			$field_value 	= esc_textarea( $field[ 'value' ] );

			// error_log( print_r( $field[ 'value' ], 1 ) );
?>
			<div class='acf-quill-editor' data-target='#<?php echo $field_id ?>'></div>
			<textarea id='<?php echo $field_id; ?>' name='<?php echo $field[ 'name' ]; ?>' style='display:none;'>
				<?php echo $field_value; ?>
				<?php // echo $this->prepare_field_value_output( $field_value ); ?>
			</textarea>
<?php
		}

		/* function prepare_field_value_output( string $field_value ) {
			$field_value = $this->add_quill_align_classes( $field_value );

			return $field_value;
		} */
		
		/* function prepare_field_value_save( string $field_value ) {
			$field_value = $this->remove_quill_align_classes( $field_value );

			error_log(json_encode( $field_value ));

			return $field_value;
		} */

		function add_quill_align_classes( string $string ) {		
			return str_replace(
				array( 'style=\"text-align:justify\"', 'style=\"text-align:center\"', 'style=\"text-align:right\"' ),
				array( 'class=\"ql-align-justify\"', 'class=\"ql-align-center\"', 'class=\"ql-align-right\"' ),
				$string
			);
		}
		
		function remove_quill_align_classes( string $string ) {
			return str_replace(
				array( 'class=\"ql-align-justify\"', 'class=\"ql-align-center\"', 'class=\"ql-align-right\"' ),
				array( 'style=\"text-align:justify\"', 'style=\"text-align:center\"', 'style=\"text-align:right\"' ),
				$string
			);
		}

		/**
		 * Runs immediately before the value is saved to the DB.
		 */
		function update_value( $value, $post_id, $field ) {
			// $value = $this->prepare_field_value_save( $value );

			return $value;
		}

		function input_admin_enqueue_scripts() {
			// Core media scripts + styles
			wp_enqueue_media();

			// Vendor
			wp_enqueue_style( 'quill-css', ACFFQE_PATH_URI_DIST . 'vendor/quill.snow.css?v=2.0.3' );
			wp_enqueue_script( 'quill-js', ACFFQE_PATH_URI_DIST . 'vendor/quill.js?v=2.0.3', [], null, true );

			// CSS
			wp_enqueue_style( 'acffqe-css', ACFFQE_PATH_URI_DIST . 'style.css', [], ACFFQE_VERSION, 'all' );

			// JS
			$deps 			= array( 'quill-js', 'jquery', 'underscore', 'wp-util' );
			$translations 	= require ACFFQE_PATH_INCLUDES . '/translations.php';
			$link_template 	= require ACFFQE_PATH_INCLUDES . '/link-template.php';

			wp_enqueue_script( 'acffqe', ACFFQE_PATH_URI_DIST . 'main.js', $deps, ACFFQE_VERSION, true );
			wp_localize_script( 'acffqe', 'acf_quill_field', array(
				'l10n' 				=> $translations,
				'link_template' 	=> $link_template,
				'load_custom_options' 	=> apply_filters( 'acf/quill-field/load_custom_options', false ),
				'custom_options' 		=> apply_filters( 'acf/quill-field/custom_options', $this->return_custom_options() ),
				'load_toolbar_config' 	=> apply_filters( 'acf/quill-field/load_toolbar_config', false ),
				'toolbar_config' 		=> apply_filters( 'acf/quill-field/toolbar_config', $this->toolbar_config() ),
			));
		}
	
		function return_custom_options() {
			return array(
				array(
					'value' => 'highlight-yellow',
					'name' 	=> __('Yellow Highlight', 'acf-quill-field'),
					'class' => 'highlight-yellow'
				),
				array(
					'value' => 'highlight-green',
					'name' 	=> __('Green Highlight', 'acf-quill-field'),
					'class' => 'highlight-green'
				),
			);
		}

		function toolbar_config() {
			return array(
				array( array( 'header' => array( 1, 2, 3, 4, 5, 6, false ) ) ),
				array( 'bold', 'italic', 'underline', 'strike', 'link' ),
				array( array( 'color' => array() ), array( 'background' => array() ) ),
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
	}

	acf_register_field_type('acf_field_quill');
