<?php

	defined( 'ABSPATH' ) || exit;

	/**
	 * Fixed GitHub Plugin Updater Class
	 * Resolves version comparison issues
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
			$this->transient_key = 'acffqe_github_update_' . md5($this->plugin_basename);

			$this->debug_log('Updater initialized with version: ' . $this->version);
			$this->init_hooks();
		}

		/**
		 * Debug logging function
		 */
		private function debug_log($message) {
			if (defined('WP_DEBUG') && WP_DEBUG) {
				error_log('ACFFQE Updater: ' . $message);
			}
		}

		/**
		 * Normalize version string - remove v prefix and ensure consistent format
		 */
		private function normalize_version($version) {
			// Remove 'v' prefix if present
			$version = ltrim($version, 'vV');
			
			// Ensure we have a valid version string
			if (empty($version) || !preg_match('/^\d+\.\d+\.\d+/', $version)) {
				return false;
			}
			
			return $version;
		}

		/**
		 * Safe version comparison
		 */
		private function is_update_available($current, $remote) {
			$current = $this->normalize_version($current);
			$remote = $this->normalize_version($remote);
			
			if (!$current || !$remote) {
				$this->debug_log('Invalid version format - Current: ' . $current . ', Remote: ' . $remote);
				return false;
			}

			$result = version_compare($current, $remote, '<');
			$this->debug_log('Version comparison: ' . $current . ' < ' . $remote . ' = ' . ($result ? 'true' : 'false'));
			
			return $result;
		}

		/**
		 * Initialize WordPress hooks
		 */
		private function init_hooks() {
			add_filter('pre_set_site_transient_update_plugins', [$this, 'check_for_update']);
			add_filter('plugins_api', [$this, 'plugin_popup'], 10, 3);
			add_filter('upgrader_post_install', [$this, 'after_install'], 10, 3);
			add_action('upgrader_process_complete', [$this, 'purge_cache'], 10, 2);
			
			// Add custom update message
			add_action('in_plugin_update_message-' . $this->plugin_basename, [$this, 'show_update_message'], 10, 2);
			
			// Add settings link for manual update check
			add_filter('plugin_action_links_' . $this->plugin_basename, [$this, 'plugin_action_links']);
			
			// Handle manual update check
			add_action('wp_ajax_acffqe_check_update', [$this, 'ajax_check_update']);
			
			// Add debug info to admin
			add_action('admin_notices', [$this, 'show_debug_info']);
		}

		/**
		 * Show debug information in admin
		 */
		public function show_debug_info() {
			if (!current_user_can('manage_options') || !isset($_GET['acffqe_debug'])) {
				return;
			}

			$remote_info = $this->get_remote_info();
			$cached_data = get_transient($this->transient_key);
			
			echo '<div class="notice notice-info">';
			echo '<h3>ACFFQE Debug Information</h3>';
			echo '<p><strong>Current Version:</strong> ' . $this->version . '</p>';
			echo '<p><strong>Normalized Current:</strong> ' . $this->normalize_version($this->version) . '</p>';
			echo '<p><strong>Plugin Basename:</strong> ' . $this->plugin_basename . '</p>';
			echo '<p><strong>Plugin Slug:</strong> ' . $this->plugin_slug . '</p>';
			echo '<p><strong>GitHub Repo:</strong> ' . $this->github_username . '/' . $this->github_repo . '</p>';
			
			if ($remote_info) {
				echo '<p><strong>Remote Version:</strong> ' . $remote_info['version'] . '</p>';
				echo '<p><strong>Normalized Remote:</strong> ' . $this->normalize_version($remote_info['version']) . '</p>';
				echo '<p><strong>Update Available:</strong> ' . ($this->is_update_available($this->version, $remote_info['version']) ? 'YES' : 'NO') . '</p>';
				echo '<p><strong>Raw GitHub Tag:</strong> ' . ($remote_info['raw_tag'] ?? 'N/A') . '</p>';
			} else {
				echo '<p><strong>Remote Info:</strong> Failed to fetch</p>';
			}
			
			echo '<p><strong>Cached Data:</strong> ' . (empty($cached_data) ? 'None' : 'Present') . '</p>';
			echo '<p><strong>Transient Key:</strong> ' . $this->transient_key . '</p>';
			
			// Show cached data details
			if (!empty($cached_data)) {
				echo '<h4>Cached Update Data:</h4>';
				echo '<pre>' . print_r($cached_data, true) . '</pre>';
			}
			
			echo '</div>';
		}

		/**
		 * Check for plugin updates
		 */
		public function check_for_update($transient) {
			$this->debug_log('check_for_update called');
			
			if (empty($transient->checked)) {
				$this->debug_log('No checked plugins, returning early');
				return $transient;
			}

			// Skip cache for debug mode
			$skip_cache = isset($_GET['acffqe_debug']) || isset($_GET['force-check']);
			
			// Don't check too frequently (unless debugging)
			$cached_response = $skip_cache ? false : get_transient($this->transient_key);
			if ($cached_response !== false && !isset($cached_response['no_update'])) {
				$this->debug_log('Using cached response');
				if (isset($cached_response['new_version']) && $this->is_update_available($this->version, $cached_response['new_version'])) {
					$transient->response[$this->plugin_basename] = (object) $cached_response;
					$this->debug_log('Added cached update to transient');
				}
				return $transient;
			}

			// Get remote version info
			$this->debug_log('Fetching remote info...');
			$remote_info = $this->get_remote_info();
			
			if ($remote_info && isset($remote_info['version'])) {
				$this->debug_log('Remote version: ' . $remote_info['version'] . ', Current: ' . $this->version);
				
				if ($this->is_update_available($this->version, $remote_info['version'])) {
					$this->debug_log('Update available, preparing update data');
					
					$update_data = [
						'slug' => $this->plugin_slug,
						'plugin' => $this->plugin_basename,
						'new_version' => $this->normalize_version($remote_info['version']),
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
					$this->debug_log('Update data added to transient');
					
					// Also force WordPress to refresh its update cache
					delete_site_transient('update_plugins');
					$this->debug_log('WordPress update cache cleared');
				} else {
					$this->debug_log('No update needed - versions are equal or current is newer');
					// Cache empty response for 6 hours
					set_transient($this->transient_key, ['no_update' => true], 6 * HOUR_IN_SECONDS);
					
					// Remove from updates if it was there before
					if (isset($transient->response[$this->plugin_basename])) {
						unset($transient->response[$this->plugin_basename]);
						$this->debug_log('Removed plugin from update list - no update needed');
					}
				}
			} else {
				$this->debug_log('Failed to get remote info');
			}

			return $transient;
		}

		/**
		 * Get remote repository information
		 */
		private function get_remote_info() {
			$this->debug_log('Getting remote info from: ' . $this->get_api_url());
			
			$request = wp_remote_get($this->get_api_url(), [
				'timeout' => 15,
				'headers' => $this->get_api_headers()
			]);
			
			if (is_wp_error($request)) {
				$this->debug_log('API request failed: ' . $request->get_error_message());
				return false;
			}

			$response_code = wp_remote_retrieve_response_code($request);
			$this->debug_log('API response code: ' . $response_code);
			
			if ($response_code !== 200) {
				$this->debug_log('Non-200 response: ' . wp_remote_retrieve_body($request));
				return false;
			}

			$body = wp_remote_retrieve_body($request);
			$data = json_decode($body, true);
			
			if (!$data || !isset($data['tag_name'])) {
				$this->debug_log('Invalid response data or missing tag_name');
				return false;
			}

			$raw_tag = $data['tag_name'];
			$version = $this->normalize_version($raw_tag);
			$this->debug_log('Raw tag: ' . $raw_tag . ', Parsed version: ' . $version);

			return [
				'version' => $version,
				'raw_tag' => $raw_tag,
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
		 * Get update message
		 */
		private function get_update_message($remote_info) {
			$message = sprintf(
				__('A new version (%s) is available from GitHub.', 'acffqe'),
				$this->normalize_version($remote_info['version'])
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
				'version' => $this->normalize_version($remote_info['version']),
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
				'requires' => '5.0',
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
			$changelog = '<h4>Version ' . $this->normalize_version($remote_info['version']) . '</h4>';
			
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
				delete_site_transient('update_plugins');
				$this->debug_log('Update caches purged after successful update');
			}
		}

		/**
		 * Add action links to plugin list
		 */
		public function plugin_action_links($links) {
			$check_update_link = '<a href="#" id="acffqe-check-update" data-nonce="' . wp_create_nonce('acffqe_check_update') . '">' . __('Check for updates', 'acffqe') . '</a>';
			
			// Add debug link for admins
			if (current_user_can('manage_options')) {
				$debug_link = '<a href="' . add_query_arg('acffqe_debug', '1') . '">' . __('Debug Info', 'acffqe') . '</a>';
				array_unshift($links, $debug_link);
			}
			
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
						nonce: $link.data('nonce'),
						force_refresh: true
					}, function(response) {
						if (response.success) {
							if (response.data.update_available) {
								// Force refresh WordPress update check
								window.location.href = window.location.href + (window.location.href.indexOf('?') > -1 ? '&' : '?') + 'force-check=1&t=' + Date.now();
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
			
			$this->debug_log('Manual update check triggered');
			
			// Clear all caches and force check
			delete_transient($this->transient_key);
			delete_site_transient('update_plugins');
			
			$remote_info = $this->get_remote_info();
			
			if ($remote_info && $this->is_update_available($this->version, $remote_info['version'])) {
				$this->debug_log('Manual check found update: ' . $remote_info['version']);
				
				// Force the update check to run
				$this->force_update_check($remote_info);
				
				wp_send_json_success([
					'update_available' => true, 
					'version' => $this->normalize_version($remote_info['version']),
					'message' => 'Update found! Refreshing page...'
				]);
			} else {
				$this->debug_log('Manual check - no update available');
				wp_send_json_success(['update_available' => false]);
			}
		}

		/**
		 * Force WordPress to recognize the update
		 */
		private function force_update_check($remote_info) {
			$update_data = [
				'slug' => $this->plugin_slug,
				'plugin' => $this->plugin_basename,
				'new_version' => $this->normalize_version($remote_info['version']),
				'url' => $this->get_github_repo_url(),
				'package' => $remote_info['download_url'],
				'icons' => [],
				'banners' => [],
				'banners_rtl' => [],
				'tested' => get_bloginfo('version'),
				'requires_php' => '7.4',
				'compatibility' => []
			];
			
			// Get current update_plugins transient
			$current_updates = get_site_transient('update_plugins');
			if (!$current_updates) {
				$current_updates = new stdClass();
				$current_updates->response = [];
			}
			
			// Add our update
			$current_updates->response[$this->plugin_basename] = (object) $update_data;
			
			// Set it back
			set_site_transient('update_plugins', $current_updates);
			
			// Also cache our data
			set_transient($this->transient_key, $update_data, 12 * HOUR_IN_SECONDS);
			
			$this->debug_log('Forced update data into WordPress transient');
		}
	}