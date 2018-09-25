const gulp = require('gulp');
const util = require("util");
const exec = util.promisify(require("child_process").exec);

const path = require("path");
const mds = require("markdown-styles");
const fs = require("fs-extra");
const readdir = util.promisify(fs.readdir);

require('kisspromise');

/*Promise.map = (arr, cb) => Promise.all(arr.map(cb));
Promise.each = (arr, cb) => Promise.all(arr.map(it => cb(it)));
Promise.parallel = (p, ...callbacks) => Promise.all(callbacks.map(cb => p.then(cb)));
Promise.filter = (p, cb) => p.then(arr => arr.filter(cb));
Promise.prototype.map = function(cb) { return this.then(arr => Promise.all(arr.map(cb))); };
Promise.prototype.each = function(cb) { return this.then(arr => Promise.all(arr.map(it => cb(it)))); };
Promise.prototype.parallel = function(...callbacks) { return Promise.all(callbacks.map(cb => this.then(cb))); };
Promise.prototype.filter = function(cb) { return this.then(arr => Promise.all(arr.filter(cb))); };*/
//Promise.prototype.all = function() { return Promise.all([this]); };

const flatten = (...arr) => arr.reduce((prev, cur) => prev.concat(Array.isArray(cur) ? flatten(...cur) : cur), []);


const normalize = (_path) => path.normalize(process.cwd() + _path);


const dirs = ["/html", "/tmp", "/pdf"];

gulp.task("html", (cb) => {
    mds.render(mds.resolveArgs({
        input: normalize("/md"),
        output: normalize("/html"),
        layout: normalize("/layouts/mixu-page"),
    }), cb);
});

gulp.task("html_for_pdf", (cb) => {
    mds.render(mds.resolveArgs({
        input: normalize("/md"),
        output: normalize("/tmp"),
        layout: "github",
    }), (err) => cb(err));
});

gulp.task("gen_pdf", (cb) => {
    fs.ensureDir(normalize("/pdf"))
        .then(() => readdir(normalize("/tmp")))
        .filter((val => val.toLowerCase().endsWith(".html")))
        .map(htmlFile => [htmlFile, path.parse(htmlFile).name])
        .map(([htmlFile, fileName]) => {
            return exec("wkhtmltopdf " +
                "--dpi 144 --viewport-size 1920x1080" + " " + 
                "\"" + normalize("/tmp/" + htmlFile) + "\" \"" + normalize("/pdf/" + fileName + ".pdf") +"\"");
        })
        .each((out) => console.log(out.stderr))
        .then(() => cb());
    }
);

const force_rmdir = (path) => fs.emptyDir(path).then(() => fs.rmdir(path));

const clean = (...directories) => (cb) => Promise.map(flatten(directories), normalize).map(force_rmdir).then(() => cb());

gulp.task("pdf", gulp.series(clean("/tmp"), "html_for_pdf", "gen_pdf"));

gulp.task("clean", clean(dirs));

gulp.task("default", gulp.series(clean(dirs), gulp.parallel("html", gulp.series("html_for_pdf", "gen_pdf"))));