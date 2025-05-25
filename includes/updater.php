<?php

	defined( 'ABSPATH' ) || exit;

	/**
	 * Enhanced GitHub Plugin Updater Class
	 */
	class ACFFQE_GitHub_Updater {
	
		private $plugin_slug;
		private $plugin_basename;
		private $version;
		private $github_username;
		private $github_repo;
		private $github_access_token;
		private $plugin_file;
		private $transient_key;
	
		public function __construct($plugin_file, $github_username, $github_repo, $access_token = '') {
			$this->plugin_file = $plugin_file;
			$this->plugin_basename = plugin_basename($plugin_file);
			$this->plugin_slug = dirname($this->plugin_basename);
			$this->version = ACFFQE_VERSION;
			$this->github_username = $github_username;
			$this->github_repo = $github_repo;
			$this->github_access_token = $access_token;
			$this->transient_key = 'acffqe_github_update_' . md5( $this->plugin_basename );
	
			$this->init_hooks();
		}
	
		/**
		 * Initialize WordPress hooks
		 */
		private function init_hooks() {
			add_filter( 'pre_set_site_transient_update_plugins', [ $this, 'check_for_update' ] );
			add_filter( 'plugins_api', [ $this, 'plugin_popup' ], 10, 3 );
			add_filter( 'upgrader_post_install', [ $this, 'after_install' ], 10, 3 );
			add_action( 'upgrader_process_complete', [ $this, 'purge_cache' ], 10, 2 );
			
			// Add custom update message
			add_action( 'in_plugin_update_message-' . $this->plugin_basename, [ $this, 'show_update_message' ], 10, 2 );
			
			// Add settings link for manual update check
			add_filter( 'plugin_action_links_' . $this->plugin_basename, [ $this, 'plugin_action_links' ] );
			
			// Handle manual update check
			add_action( 'wp_ajax_acffqe_check_update', [ $this, 'ajax_check_update' ] );
		}
	
		/**
		 * Check for plugin updates
		 */
		public function check_for_update($transient) {
			if (empty($transient->checked)) {
				return $transient;
			}
	
			// Don't check too frequently
			$cached_response = get_transient( $this->transient_key );
			if ($cached_response !== false) {
				if (isset($cached_response['new_version']) && version_compare($this->version, $cached_response['new_version'], '<')) {
					$transient->response[$this->plugin_basename] = (object) $cached_response;
				}
				return $transient;
			}
	
			// Get remote version info
			$remote_info = $this->get_remote_info();
			
			if ($remote_info && isset($remote_info['version']) && version_compare($this->version, $remote_info['version'], '<')) {
				$update_data = [
					'slug' => $this->plugin_slug,
					'plugin' => $this->plugin_basename,
					'new_version' => $remote_info['version'],
					'url' => $this->get_github_repo_url(),
					'package' => $remote_info['download_url'],
					'icons' => [],
					'banners' => [],
					'banners_rtl' => [],
					'tested' => get_bloginfo('version'),
					'requires_php' => '7.4',
					'compatibility' => [],
					'update_message' => $this->get_update_message($remote_info)
				];
				
				// Cache the response for 12 hours
				set_transient($this->transient_key, $update_data, 12 * HOUR_IN_SECONDS);
				
				$transient->response[$this->plugin_basename] = (object) $update_data;
			} else {
				// Cache empty response for 6 hours
				set_transient($this->transient_key, ['no_update' => true], 6 * HOUR_IN_SECONDS);
			}
	
			return $transient;
		}
	
		/**
		 * Get remote repository information
		 */
		private function get_remote_info() {
			$request = wp_remote_get($this->get_api_url(), [
				'timeout' => 15,
				'headers' => $this->get_api_headers()
			]);
			
			if (is_wp_error($request)) {
				error_log('ACFFQE GitHub Updater Error: ' . $request->get_error_message());
				return false;
			}
	
			$response_code = wp_remote_retrieve_response_code($request);
			if ($response_code !== 200) {
				error_log('ACFFQE GitHub Updater Error: HTTP ' . $response_code);
				return false;
			}
	
			$body = wp_remote_retrieve_body($request);
			$data = json_decode($body, true);
			
			if (!$data || !isset($data['tag_name'])) {
				error_log('ACFFQE GitHub Updater Error: Invalid response data');
				return false;
			}
	
			return [
				'version' => ltrim($data['tag_name'], 'v'),
				'download_url' => $data['zipball_url'] ?? $this->get_download_url(),
				'release_notes' => $data['body'] ?? '',
				'published_at' => $data['published_at'] ?? '',
				'prerelease' => $data['prerelease'] ?? false
			];
		}
	
		/**
		 * Get API headers with authentication if token is provided
		 */
		private function get_api_headers() {
			$headers = [
				'Accept' => 'application/vnd.github.v3+json',
				'User-Agent' => 'WordPress/' . get_bloginfo('version') . '; ' . get_bloginfo('url')
			];
	
			if (!empty($this->github_access_token)) {
				$headers['Authorization'] = 'token ' . $this->github_access_token;
			}
	
			return $headers;
		}
	
		/**
		 * Get GitHub API URL for latest release
		 */
		private function get_api_url() {
			return "https://api.github.com/repos/{$this->github_username}/{$this->github_repo}/releases/latest";
		}
	
		/**
		 * Get GitHub repository URL
		 */
		private function get_github_repo_url() {
			return "https://github.com/{$this->github_username}/{$this->github_repo}";
		}
	
		/**
		 * Get fallback download URL
		 */
		private function get_download_url() {
			return "https://github.com/{$this->github_username}/{$this->github_repo}/archive/refs/heads/main.zip";
		}
	
		/**
		 * Show plugin information popup
		 */
		public function plugin_popup($result, $action, $args) {
			if ($action !== 'plugin_information' || $args->slug !== $this->plugin_slug) {
				return $result;
			}
	
			$remote_info = $this->get_remote_info();
			
			if (!$remote_info) {
				return $result;
			}
	
			$result = (object) [
				'name' => 'ACF Field: Quill Editor',
				'slug' => $this->plugin_slug,
				'version' => $remote_info['version'],
				'author' => '<a href="https://www.sikmo.cz">šikmo.cz / Pavel Mareš</a>',
				'author_profile' => 'https://www.sikmo.cz',
				'homepage' => $this->get_github_repo_url(),
				'short_description' => 'QuilJS WYSIWYG editor instead of old TinyMCE',
				'sections' => [
					'description' => 'QuilJS WYSIWYG editor instead of old TinyMCE for Advanced Custom Fields.',
					'installation' => 'Upload the plugin files to the `/wp-content/plugins/acf-quill-field` directory, or install the plugin through the WordPress plugins screen directly. Activate the plugin through the \'Plugins\' screen in WordPress.',
					'changelog' => $this->format_changelog($remote_info)
				],
				'download_link' => $remote_info['download_url'],
				'last_updated' => $remote_info['published_at'],
				'requires' => '6.0',
				'tested' => get_bloginfo('version'),
				'requires_php' => '7.4',
				'compatibility' => []
			];
	
			return $result;
		}
	
		/**
		 * Format changelog from release notes
		 */
		private function format_changelog($remote_info) {
			$changelog = '<h4>Version ' . $remote_info['version'] . '</h4>';
			
			if (!empty($remote_info['published_at'])) {
				$changelog .= '<p><strong>Released:</strong> ' . date('F j, Y', strtotime($remote_info['published_at'])) . '</p>';
			}
			
			if (!empty($remote_info['release_notes'])) {
				$changelog .= wpautop($remote_info['release_notes']);
			} else {
				$changelog .= '<p>No changelog available for this version.</p>';
			}
			
			return $changelog;
		}
	
		/**
		 * Get update message
		 */
		private function get_update_message($remote_info) {
			$message = sprintf(
				__('A new version (%s) is available from GitHub.', 'acffqe'),
				$remote_info['version']
			);
			
			if (!empty($remote_info['prerelease'])) {
				$message .= ' ' . __('This is a pre-release version.', 'acffqe');
			}
			
			return $message;
		}
	
		/**
		 * Show custom update message in plugins list
		 */
		public function show_update_message($plugin_data, $response) {
			if (isset($response->update_message)) {
				echo '<br />' . wp_kses_post($response->update_message);
			}
		}
	
		/**
		 * Perform additional actions after plugin install
		 */
		public function after_install($response, $hook_extra, $result) {
			if (!isset($hook_extra['plugin']) || $hook_extra['plugin'] !== $this->plugin_basename) {
				return $result;
			}
	
			global $wp_filesystem;
			$install_directory = plugin_dir_path($this->plugin_file);
			
			if ($result['destination'] !== $install_directory) {
				$wp_filesystem->move($result['destination'], $install_directory);
				$result['destination'] = $install_directory;
			}
	
			return $result;
		}
	
		/**
		 * Purge update cache after plugin update
		 */
		public function purge_cache($upgrader, $hook_extra) {
			if (isset($hook_extra['plugins']) && in_array($this->plugin_basename, $hook_extra['plugins'])) {
				delete_transient($this->transient_key);
			}
		}
	
		/**
		 * Add action links to plugin list
		 */
		public function plugin_action_links($links) {
			$check_update_link = '<a href="#" id="acffqe-check-update" data-nonce="' . wp_create_nonce('acffqe_check_update') . '">' . __('Check for updates', 'acffqe') . '</a>';
			array_unshift($links, $check_update_link);
			
			// Add inline script for AJAX update check
			add_action('admin_footer', [$this, 'add_update_check_script']);
			
			return $links;
		}
	
		/**
		 * Add JavaScript for manual update check
		 */
		public function add_update_check_script() {
			?>
			<script type="text/javascript">
			jQuery(document).ready(function($) {
				$('#acffqe-check-update').on('click', function(e) {
					e.preventDefault();
					var $link = $(this);
					var originalText = $link.text();
					
					$link.text('<?php _e('Checking...', 'acffqe'); ?>');
					
					$.post(ajaxurl, {
						action: 'acffqe_check_update',
						nonce: $link.data('nonce')
					}, function(response) {
						if (response.success) {
							if (response.data.update_available) {
								alert('<?php _e('Update available! Please refresh the page to see the update.', 'acffqe'); ?>');
								location.reload();
							} else {
								alert('<?php _e('Your plugin is up to date!', 'acffqe'); ?>');
							}
						} else {
							alert('<?php _e('Error checking for updates. Please try again later.', 'acffqe'); ?>');
						}
						$link.text(originalText);
					}).fail(function() {
						alert('<?php _e('Error checking for updates. Please try again later.', 'acffqe'); ?>');
						$link.text(originalText);
					});
				});
			});
			</script>
			<?php
		}
	
		/**
		 * Handle AJAX update check
		 */
		public function ajax_check_update() {
			check_ajax_referer('acffqe_check_update', 'nonce');
			
			// Clear cache and check for updates
			delete_transient($this->transient_key);
			$remote_info = $this->get_remote_info();
			
			if ($remote_info && version_compare($this->version, $remote_info['version'], '<')) {
				wp_send_json_success(['update_available' => true, 'version' => $remote_info['version']]);
			} else {
				wp_send_json_success(['update_available' => false]);
			}
		}
	}