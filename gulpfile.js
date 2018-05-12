const gulp = require('gulp');
const sass = require('gulp-sass');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const postcss = require('gulp-postcss');
const rollup = require('gulp-rollup-each');
const uglify = require('gulp-uglify');
const util = require('gulp-util');
const babel = require('rollup-plugin-babel');
const pump = require('pump');
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const browserSync = require('browser-sync').create();
const awspublish = require('gulp-awspublish');
const es = require('event-stream');

// Configure Environment
require('dotenv').config();

const PRODUCTION = process.env.NODE_ENV === 'production';

//
// === Sass ===
//

let postCssPlugins = [
	autoprefixer({browsers: ['last 1 version']}),
];

if (PRODUCTION) {
	postCssPlugins = postCssPlugins.concat([
		cssnano()
	]);
}

//
// === Rollup Config ===
//

const rollupConfig = {
	output: {
		format: 'iife'
	},
	sourcemap: !PRODUCTION && 'inline',
	plugins: [
		babel({
			exclude: 'node_modules/**'
		}),
		resolve(),
		commonjs(),
	]
};

//
// === AWS Settings ===
//

const awsPublisherConfig = {
	region: process.env.AWS_REGION,
	params: {
		Bucket: process.env.AWS_BUCKET
	},
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_ID,
		secretAccessKey: process.env.AWS_ACCESS_KEY,
		signatureVersion: process.env.AWS_SIGNATURE_VERSION,
	},
};

const awsCache = {
	cacheFileName: '.aws-cache'
};

const awsHeaders = {
	'Cache-Control': 'max-age=315360000, no-transform, public'
};

const textFileSource = [
	// Build
	'./build/**/*',
	'!./build/**/*.jpg',
	'!./build/**/*.png',
	'!./build/**/*.svg',
	'!./build/**/*.gif',
	// Public
	'./public/**/*',
	'!./public/**/*.jpg',
	'!./public/**/*.png',
	'!./public/**/*.svg',
	'!./public/**/*.gif',
];

const imageFileSource = [
	// Build
	'./build/**/*.jpg',
	'./build/**/*.png',
	'./build/**/*.svg',
	'./build/**/*.gif',
	// Public
	'./public/**/*.jpg',
	'./public/**/*.png',
	'./public/**/*.svg',
	'./public/**/*.gif',
];

//
// === Pack Assets ===
//

gulp.task('sass', callback => {
	pump([
		gulp.src('./src/styles/*.scss'),
		sass({includePaths: './src/styles'}).on('error', sass.logError),
		postcss(postCssPlugins),
		gulp.dest('./build/assets'),
		browserSync.stream()
	], callback);
});

gulp.task('rollup', callback => {
	pump([
		gulp.src('./src/*.js'),
		rollup(rollupConfig),
		PRODUCTION ? uglify() : util.noop(),
		gulp.dest('./build/assets'),
		browserSync.stream()
	], callback);
});

//
// === Root Tasks ===
//

gulp.task('default', ['sass', 'rollup']);

gulp.task('watch', ['default'], () => {
	browserSync.init({
		server: ['public', 'build']
	});

	gulp.watch('./src/styles/**/*.scss', ['sass']);
	gulp.watch('./src/**/*.js', ['rollup']);
	gulp.watch('./public/**/*').on('change', browserSync.reload);
});

gulp.task('deploy', function() {
	const publisher = awspublish.create(awsPublisherConfig, awsCache);

	// Gzip text files into stream, not images
	const gzStream = gulp
		.src(textFileSource)
		.pipe(awspublish.gzip());

	// Images stream
	const picStream = gulp
		.src(imageFileSource);

	return es.merge(gzStream, picStream)
		// publisher will add Content-Length, Content-Type and headers specified above
		// If not specified it will set x-amz-acl to public-read by default
		.pipe(publisher.publish(awsHeaders))
		// create a cache file to speed up consecutive uploads
		.pipe(publisher.cache())
		// print upload updates to console
		.pipe(awspublish.reporter());
});