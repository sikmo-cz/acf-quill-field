import gulp from 'gulp';
import sourcemaps from 'gulp-sourcemaps';
import gulpSass from 'gulp-sass';
import * as sass from 'sass';
import concat from 'gulp-concat';
import postcss from 'gulp-postcss';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import notify from 'gulp-notify';
import webpack from 'webpack-stream';
import wpPot from 'gulp-wp-pot';

function notifyMessage(message) {
    return notify({
        title: '',
        icon: 'Terminal Icon',
        message: message,
        onLast: true,
    });
}

const sassCompiler = gulpSass(sass);

function scss(done) {
    return gulp.src(['src/sass/style.scss'])
        .pipe(sourcemaps.init())
        .pipe(sassCompiler({ 
            outputStyle: 'expanded',
            quietDeps: true,
            logger: {
                warn: function(message) {
                    // Ignoruj všechny deprecation a info zprávy
                    if (message.includes('Deprecation') || 
                        message.includes('deprecated') ||
                        message.includes('legacy') ||
                        message.includes('More info:') ||
                        message.includes('Suggestion:')) {
                        return;
                    }
                    // Zobraz pouze ostatní varování
                    console.warn(message);
                },
                debug: function() { },  // Ignoruj debug zprávy
                error: function(message) {
                    // Zobraz pouze skutečné chyby
                    if (!message.includes('Deprecation') && 
                        !message.includes('deprecated') &&
                        !message.includes('legacy')) {
                        console.error(message);
                    }
                }
            },
            verbose: false
        }).on('error', sassCompiler.logError))
        .pipe(postcss([autoprefixer(), cssnano()]))
        .pipe(concat('style.css'))
        .pipe(sourcemaps.write('./maps'))
        .pipe(gulp.dest('./dist/'))
        .pipe(notifyMessage('style.css updated.'))
        .on('end', function() { done(); });
}

function globalJS() {
    return gulp.src('src/js/main.js')
        .pipe(sourcemaps.init())
        .pipe(webpack({
            mode: 'production',
            devtool: 'source-map',
            output: {
                filename: 'main.js',
                sourceMapFilename: './maps/main.js.map',
                libraryTarget: 'var',
				library: 'acfQuillFieldPlugin',
            },
            module: {
                rules: [{
                    test: /\.js$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: ['@babel/preset-env']
                        }
                    }
                }]
            },
			stats: 'errors-only'
        }))
		.pipe(sourcemaps.write('./maps'))
        .pipe(gulp.dest('./dist/'))
        .pipe( notifyMessage( 'main.js updated.' ) );
}

gulp.task('lang', function () {
    return gulp.src('./**/*.php')
        .pipe(wpPot({
            domain: 'acffqe',
            package: 'acffqe',
            bugReport: 'https://www.sikmo.cz/',
            lastTranslator: 'šikmo <jdeme@sikmo.cz>',
            team: 'šikmo <jdeme@sikmo.cz>',
        }))
        .pipe(gulp.dest('languages/acf-quill-field.pot'))
});

function watchFiles() {
    gulp.watch('src/sass/**/*.scss', scss);
    gulp.watch('src/js/**/*.js', globalJS);
}

export default gulp.series( scss, globalJS, watchFiles );