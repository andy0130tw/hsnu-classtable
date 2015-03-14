var gulp = require('gulp'),
    gulpif = require('gulp-if'),
    useref = require('gulp-useref'),
    uglify = require('gulp-uglify'),
    concat = require('gulp-concat'),
    inject = require('gulp-inject'),
    minifyCss = require('gulp-minify-css'),
    minifyHtml = require('gulp-minify-html'),
    angularTemplates = require('gulp-angular-templates'),
    ngAnnotate = require('gulp-ng-annotate'),
    rebaseUrls = require('gulp-css-rebase-urls'),
    runSequence = require("run-sequence").use(gulp);

var path = {
    template: 'template/**/*.html',
    assets: [
        'image/**/*',
        'fonts/**/*',
        'api/**/*',
        'db/**/*',
        'test_data/**/*'
    ]
};

var dist = {
    base: 'dist/',
    js: 'dist/js/',
    template: 'dist/js/',
    css: 'dist/css/'
};

var filename = {
    templateMerged: 'template.js',
    index: 'index.html'
};

var minifyHtmlOption = {
	conditionals: true,
	empty: true,
	quotes: true
};

gulp.task('combine', function() {
    var assets = useref.assets();
    return gulp.src(filename.index)
        .pipe(assets)
        .pipe(gulpif('*.js', uglify()))
        .pipe(gulpif('*.js', ngAnnotate()))
        .pipe(gulpif('*.css', rebaseUrls()))
        .pipe(gulpif('*.css', minifyCss()))
        .pipe(assets.restore())
        .pipe(useref())
        .pipe(gulp.dest(dist.base));
});

gulp.task('template', function() {
    return gulp.src(path.template)
        .pipe(minifyHtml(minifyHtmlOption))
        .pipe(angularTemplates({
            module: 'hsnusch',
            basePath: 'template/'
        }))
        .pipe(uglify())
        .pipe(concat(filename.templateMerged))
        .pipe(gulp.dest(dist.template));
});

gulp.task('inject-template', function() {
    return gulp.src(dist.base + filename.index)
        // .pipe(concat('app2.js'))
        // .pipe(gulp.dest(dist.js));
        .pipe(inject(gulp.src(dist.template + filename.templateMerged), {
            relative: true
        }))
        .pipe(gulp.dest(dist.base))
});

gulp.task('minify-html', function() {
    return gulp.src(dist.base + filename.index)
        .pipe(minifyHtml(minifyHtmlOption))
        .pipe(gulp.dest(dist.base))
});

gulp.task('copy', function() {
    return gulp.src(path.assets, {
            base: '.'
        })
        .pipe(gulp.dest(dist.base))

});

gulp.task('default', function() {
    return runSequence('combine', 'template', 'inject-template', 'minify-html', 'copy');
});
