// File system backend for mp3 files
// source-xx modules must export the following functions:
//   - (void) getFiles(params = {}, callback) -- returns all files (can be a large dataset)
//     - params -- (Object) -- currently null
//     - callback: function(err, data) { ... }
//       - err -- (Error) -- the error object returned, set to null if successful
//       - data -- (Object)
//         - isTruncated -- (Boolean) flag that indicates all results are returned
//         - marker -- (String) to use with next request if truncated
//         - contents -- (Array<String>) -- list of files returned.
//   - (Stream) createReadFileStream(String) -- key of file to read

var fs = require('fs');
var path = require('path');

var walk = function(dir, done) {
  var results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    var pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(function(file) {
      file = dir + '/' + file;
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          results.push(file);
          if (!--pending) done(null, results);
        }
      });
    });
  });
};

// fs_config
//   - root -- (String) root directory of files
var SourceFs = module.exports = function(fs_config) {
  this.config = fs_config;
}

SourceFs.prototype.createReadFileStream = function(key) {
  var fullPath = path.join(this.config.root, key);
  return fs.createReadStream(fullPath);
}

SourceFs.prototype.getFiles = function(params, callback) {
  var config = this.config;
  walk(config.root, function(err, result) {
    if (err) {
      callback(err, null);
    } else {
      // strip config.root from results
      for (var i = 0; i < result.length; i++) {
        result[i] = result[i].replace(config.root, '');
      }

      callback(null, {
        isTruncated: null,
        marker: null,
        contents: result});
    }
  });
}

