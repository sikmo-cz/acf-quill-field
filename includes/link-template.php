<?php

	defined( 'ABSPATH' ) || exit;

	ob_start();
?>
	<div class="acf-quill-link-box">
		<h3><?php _e( 'Create / edit link', 'acffqe' ); ?></h3>
		<form>
			<label for="quill-link-url"><?php _e( 'URL', 'acffqe' ); ?></label>
			<input type="text" id="quill-link-url" name="href" required value="{{HREF}}">
			
			<label for="quill-link-title"><?php _e( 'Title', 'acffqe' ); ?></label>
			<input type="text" id="quill-link-title" name="title" value="{{TITLE}}">
			
			<label for="quill-link-class"><?php _e( 'CSS class', 'acffqe' ); ?></label>
			<input type="text" id="quill-link-class" name="class" value="{{CLASS}}">
			
			<div class="checkbox-row">
				<input type="checkbox" id="quill-link-target" name="target" {{TARGET}}>
				<label for="quill-link-target"><?php _e( 'Open link in new tab', 'acffqe' ); ?></label>
			</div>
			
			<label for="quill-link-rel"><?php _e( 'Rel attribute', 'acffqe' ); ?></label>
			<input type="text" id="quill-link-rel" name="rel" value="{{REL}}">
			
			<div class="rel-options">
				<div class="checkbox-row">
					<input type="checkbox" id="quill-link-rel-nofollow" name="rel_nofollow" {{NO_FOLLOW}}>
					<label for="quill-link-rel-nofollow"><?php _e( 'Add rel="nofollow"', 'acffqe' ); ?></label>
				</div>
				<div class="checkbox-row">
					<input type="checkbox" id="quill-link-rel-sponsored" name="rel_sponsored" {{SPONSORED}}>
					<label for="quill-link-rel-sponsored"><?php _e( 'Add rel="sponsored"', 'acffqe' ); ?></label>
				</div>
			</div>
			
			<footer>
				<button type="button" class="remove-btn" data-act="remove"><?php _e( 'Remove link', 'acffqe' ); ?></button>
				<div class="action-btns">
					<button type="button" data-act="cancel"><?php _e( 'Cancel', 'acffqe' ); ?></button>
					<button type="submit"><?php _e( 'Save', 'acffqe' ); ?></button>
				</div>
			</footer>
		</form>
	</div>
<?php

	$output = ob_get_contents();
	ob_end_clean();

	return $output;