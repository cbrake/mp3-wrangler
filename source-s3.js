// S3 mp3 file backend

var AWS = require('aws-sdk')
var fs = require('fs')
var mm = require('musicmetadata')
var util = require('util')
var async = require('async')
var archiver = require('archiver')

var SourceS3 = module.exports = function(db_albums, db_tracks, s3_config) {
  AWS.config.update(s3_config);

  this.config = s3_config;
  this.db_albums = db_albums;
  this.db_tracks = db_tracks;
  this.s3 = new AWS.S3();
  this.s3_params = {
    Bucket:s3_config.bucket
  }
}

SourceS3.prototype.update = function() {
  // TODO, need to implement a callback when finished

  var s3 = this.s3;
  var s3_params = this.s3_params;
  var db_albums = this.db_albums;
  var db_tracks = this.db_tracks;

  // queue requests for ID3 data so we don't get 1000's of open requests
  // at one time
  var id3_queue = async.queue(function(s3_key, callback) {
    // fetch file so we can parse id3 tags
    var params = s3_params;
    params.Key = s3_key;
    var stream = s3.getObject(params).createReadStream();
    var parser = new mm(stream);
    parser.on('metadata', function(result) {
      var doc = {key: s3_key, id3: result};
      db_tracks.insert(doc, function(err, newDoc) {
        if (err) {
          return console.log("Error inserting track into db: " + err);
        }
      })
    })
    parser.on('done', function(err) {
      if (err) {
        return console.log('parser error: ' + err);
      }
      // TODO: stop stream to save bandwidth
      // could possibly stop stream after we have metadata as well
      callback();
    });
  }, 1);

  function process_s3_data(data) {
    console.log("Processing S3 data ...");
    if (data.IsTruncated === true) {
      console.log('WARNING: S3 data is truncated');
    }

    data.Contents.forEach(function(item) {
      if (/.*\.mp3$/.exec(item.Key)) {
        db_tracks.find({key: item.Key}, function(err, docs) {
          if (err) {
            return console.log('track find error: ' + err);
          }
          if (docs.length == 0) {
            console.log('Getting ID3 tags for ' + item.Key);
            id3_queue.push(item.Key, function(err) {
              console.log('finished processing ' + item.Key);
            })
          } else {
          }
        })
      }
    })
  }

  function create_albums() {
    console.log("Creating albums ...");
    db_tracks.find({}, function(err, docs) {
      docs.forEach(function(doc) {
        ['artist', 'genre'].forEach(function(field) {
          if (doc.id3[field].length == 0) {
            doc.id3[field].push('None');
          }
        })

        var album_key = doc.id3.genre + '/' + doc.id3.artist + '/' + doc.id3.album;
        db_albums.update({key:album_key}, {$addToSet: {tracks: doc.key}}, {upsert: true}, function(err, n, upsert) {
          if (err) {
            return console.log('Error updating db_albums: ' + err);
          } else {
          }
        })
      })
    })
  }

  id3_queue.drain = create_albums;

  s3.listObjects(s3_params, function(err, data) {
    if (err) {
      return console.log(err);
    }
    process_s3_data(data);
  });
}

SourceS3.prototype.createReadFileStream = function(key) {
  var params = this.s3_params;
  params.Key = key;
  return this.s3.getObject(params).createReadStream();
}

SourceS3.prototype.createDownloadStream = function(albums) {

  // cycle through albumns and tracks and add to zip file
  var archive = archiver('zip');

  var s3 = this.s3;
  var db_albums = this.db_albums;
  var s3_params = this.s3_params;

  function process_track(track, callback) {
    var params = s3_params;
    params.Key = track;
    var s3_stream = s3.getObject(params).createReadStream();
    s3_stream.on('error', function() {
      console.log('error with s3_stream: ' + track);
    });
    s3_stream.on('end', function() {
      callback();
    });

    archive.append(s3_stream, {name: track});
  }

  var track_queue = async.queue(process_track, 1);

  function process_album(album) {
    db_albums.findOne({key: album}, function(err, doc) {
      if (err) {
        return console.log('/download db error: ' + err);
      }
      if (doc) {
        doc.tracks.forEach(function(track) {
          track_queue.push(track, function(err) {
            if (err) {
              return console.log('error processing ' + track);
            }
          });
        });
      }
    });
  }

  function finalize_zip() {
    archive.finalize(function(err, bytes) {
      if (err) {
        return console.log('zip error: ' + err);
      }
      console.log('zip bytes: ' + bytes);
    });
  }

  albums.forEach(process_album);
  track_queue.drain = finalize_zip;

  return archive;
}

