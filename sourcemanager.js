// SourceManager
// takes a source, and does various batch operations
// exports:
//   - (void) update(callback)
//     - callback: function(err) { ... }
//   - (stream) createReadFileStream(String) -- String is aws key
//   - (stream) createDownloadStream(Array<String>) -- creates zip file for array of albums

var mm = require('musicmetadata');
var async = require('async');
var archiver = require('archiver');

var SourceManager = module.exports = function(dbAlbums, dbTracks, source) {
  this.dbAlbums = dbAlbums;
  this.dbTracks = dbTracks;
  this.source = source;
}


SourceManager.prototype.update = function(callback) {

  var dbAlbums = this.dbAlbums;
  var dbTracks = this.dbTracks;
  var source = this.source;

  // this function refreshes the albumn db from the tracks db
  // TODO implement callback
  function create_albums() {
    console.log("Creating albums ...");
    dbTracks.find({}, function(err, docs) {
      docs.forEach(function(doc) {
        ['artist', 'genre'].forEach(function(field) {
          if (doc.id3[field].length == 0) {
            doc.id3[field].push('None');
          }
        })

        var album_key = doc.id3.genre + '/' + doc.id3.artist + '/' + doc.id3.album;
        dbAlbums.update({key:album_key}, {$addToSet: {tracks: doc.key}}, {upsert: true}, function(err, n, upsert) {
          if (err) {
            return console.log('Error updating dbAlbums: ' + err);
          } else {
          }
        })
      })
    })
  }

  function process_data(data) {
    var fetch_id3_data = false;

    console.log("Processing data, " + data.contents.length + " entries ...");
    if (data.IsTruncated === true) {
      console.log('WARNING: data is truncated');
    }

    function processDataIterator(item, callback) {
      if (/.*\.mp3$/.exec(item)) {
        // FIXME, this is blowing the stack
        dbTracks.find({key: item}, function(err, docs) {
          if (err) {
            console.log("dbTracks.find error");
            callback(err);
          } else {
            if (docs.length == 0) {
              console.log('Getting ID3 tags for ' + item);
              fetch_id3_data = true;
              var stream = source.createReadFileStream(item);
              var parser = new mm(stream);
              parser.on('metadata', function(result) {
                var doc = {key: item, id3: result};
                dbTracks.insert(doc, function(err, newDoc) {
                  if (err) {
                    console.log("Error inserting track into db: " + err);
                  }
                })
              })
              parser.on('done', function(err) {
                if (err) {
                  console.log('parser error: ' + item + ' :' + err);
                }
                setImmediate(callback);
              });
            } else {
              setImmediate(callback);
            }
          }
        })
      } else {
        setImmediate(callback);
      }
    }

    async.eachSeries(data.contents, processDataIterator, function(err) {
      console.log("Finished processing items");
      if (err) {
        callback (err);
      } else if (!fetch_id3_data) {
        // we are finished
        callback(null);
      } else {
        create_albums();
      }
    })
  }

  source.getFiles(null, function(err, data) {
    if (err) {
      console.log("Error source.getFiles: " + err);
    } else {
      process_data(data);
    }
  })
}

SourceManager.prototype.createReadFileStream = function(name) {
  var source = this.source;
  return source.createReadFileStream(name);
}

SourceManager.prototype.createDownloadStream = function(albums) {

  // cycle through albumns and tracks and add to zip file
  var archive = archiver('zip', {level:0});

  var source = this.source;
  var dbAlbums = this.dbAlbums;

  function process_track(track, callback) {
    var fileStream = source.createReadFileStream(track);
    fileStream.on('error', function() {
      console.log('error with source: ' + track);
    });
    fileStream.on('end', function() {
      callback();
    });

    archive.append(fileStream, {name: track});
  }

  var track_queue = async.queue(process_track, 1);

  function process_album(album) {
    dbAlbums.findOne({key: album}, function(err, doc) {
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




