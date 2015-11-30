// include the required packages.
var gulp = require('gulp')
var stylus = require('gulp-stylus')
var plumber = require('gulp-plumber')
var nib = require('nib')
var minimist = require('minimist')
var gls = require('gulp-live-server')
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');

var argv = minimist(process.argv.slice(2))

var paths = {
  config: 'config.json',
  gulpfile: 'gulpfile.js',
  js: {
    main: 'js/main.js',
    thirdparty: [
      'jquery-1.11.0.min.js',
      'underscore-min.js',
      'backbone-min.js',
      'imagesloaded.pkgd.min.js',
      'jquery.detectSwipe.js',
      'scrollfix.js',
      'fastclick.js',
      'sideburns.js'
    ].map(function(lib){ return 'js/thirdparty/' + lib }),
    allThirdparty: 'js/thirdparty/*.js'
  },
  css : {
    styl: 'css/styles.styl'
    // css: 'css/styles.css'
  }
}

paths.js.all = paths.js.thirdparty.concat([paths.js.main])

// paths.all = [paths.js.main, paths.css.styl, 'index.html', 'imgs/**/*', 'data/pages.json', 'config.json']

var port = argv.port || process.env.PORT || 8000

var server
gulp.task('serve', function() {
  server = gls.static('/', port)
  server.start()
})

gulp.task('compile-stylus', function() {
  gulp.src(paths.css.styl)
    .pipe(plumber())
    .pipe(stylus({
      use: nib()
    }))
    .pipe(gulp.dest('css/'))
})

gulp.task('make-js-pkg', function() {
  return gulp.src(paths.js.all)
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(uglify({
      preserveComments: 'some'
    }))
    .pipe(concat('main.pkgd.min.js')) // The file to write out
    .pipe(sourcemaps.write('./')) // Write these in the same folder as our `dest` in the line below
    .pipe(gulp.dest('./js/'));
});

gulp.task('watch', function() {
  gulp.watch([paths.gulpfile, paths.config, paths.css.styl, paths.js.main, paths.js.allThirdparty], ['compile-stylus', 'make-js-pkg'])
});

gulp.task('default', ['compile-stylus']); // Simply compile
gulp.task('watch-files',   ['watch', 'compile-stylus', 'make-js-pkg', 'serve']); // Watch files for changes