// S3 mp3 file backend
// source-xx modules must export the following functions:
//   - (void) getFiles(params = {}, callback) -- returns up to 1000 files.
//     - params -- (Object)
//       - marker -- (String) specifies the key to start with when listing objects
//     - callback: function(err, data) { ... }
//       - err -- (Error) -- the error object returned, set to null if successful
//       - data -- (Object)
//         - isTruncated -- (Boolean) flag that indicates all results are returned
//         - marker -- (String) to use with next request if truncated
//         - contents -- (Array<String>) -- list of files returned.
//   - (Stream) createReadFileStream(String) -- key of file to read

var AWS = require('aws-sdk');

var SourceS3 = module.exports = function(s3_config) {
  AWS.config.update(s3_config);

  this.config = s3_config;
  this.s3 = new AWS.S3();
  this.s3_params = {
    Bucket:s3_config.bucket
  }
}

SourceS3.prototype.createReadFileStream = function(key) {
  var params = this.s3_params;
  params.Key = key;
  return this.s3.getObject(params).createReadStream();
}

SourceS3.prototype.getFiles = function(params, callback) {
  var params_ = this.s3_params;
  // FIXME params_[Marker] = params.marker;
  this.s3.listObjects(params_, function(err, data) {
    if (err) {
      callback(err, null);
    } else {
      var retData = {
        isTruncated: data.IsTruncated,
        marker: data.Marker,
        contents: []
      }

      data.Contents.forEach(function(item) {
        retData.contents.push(item.Key);
      })

      callback(err, retData);
    }
  })
}


