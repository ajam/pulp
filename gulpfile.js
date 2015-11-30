// include the required packages.
var gulp = require('gulp')
var stylus = require('gulp-stylus')
var plumber = require('gulp-plumber')
var nib = require('nib')
var minimist = require('minimist')
var gls = require('gulp-live-server')
var jsonStylus = require('gulp-json-stylus');

var argv = minimist(process.argv.slice(2))

var paths = {
  config: 'config.json',
  js: {
    main: 'js/main.js'
  },
  css : {
    styl: 'css/styles.styl'
    // css: 'css/styles.css'
  }
};

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

gulp.task('watch', function() {
  gulp.watch(paths.css.styl, ['compile-stylus'])
});

gulp.task('default', ['compile-stylus']); // Simply compile
gulp.task('watch-files',   ['watch', 'compile-stylus', 'serve']); // Watch files for changes