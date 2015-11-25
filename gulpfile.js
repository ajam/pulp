// include the required packages.
var gulp = require('gulp')
var stylus = require('gulp-stylus')
var plumber = require('gulp-plumber')
var nib = require('nib')

var paths = {
  // js: {
  //   main: 'js/main.js'
  // }
  css : {
    main: 'css/styles.styl'
  }
}

gulp.task('compile-stylus', function() {
  gulp.src(paths.css.main)
    .pipe(plumber())
    .pipe(stylus({
      use: nib()
    }))
    .pipe(gulp.dest('css/'))
})

gulp.task('watch', function() {
  gulp.watch(paths.css.main, ['compile-stylus'])
});

gulp.task('default', ['compile-stylus']); // Simply compile
gulp.task('watch-files',   ['watch', 'compile-stylus']); // Watch files for changes