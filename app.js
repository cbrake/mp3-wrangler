var express = require('express')
var AWS = require('aws-sdk')
var fs = require('fs')
var Datastore = require('nedb')
var mm = require('musicmetadata')
var util = require('util')
var async = require('async')

// local modules
var config = require('./aws-config.json')

AWS.config.loadFromPath('./aws-config.json')

var s3 = new AWS.S3();

var s3_params = {
  Bucket:config.bucket
}

// tracks db, contains:
// track - (Object)
//   key - (String) S3 key
//   id3 - (Object) object containing all id3 tags found
var db_tracks = new Datastore({filename: './tracks.db', autoload: true});

// albums db 
// documents are organized in the database assuming every directory
// of mp3 files gets mapped to a document regardless of ID3 tags.
// album - (Object)
//   key - (String) directory of mp3 files
//   genre - (String) extracted from directory
//   artist - (String) extracted from directory
//   album - (String) extracted from directory
//   tracks - (Array<String>) S3 key
var db_albums = new Datastore({filename: './albums.db', autoload: true});

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
        console.log("Error inserting track into db: " + err);
      }
    })
  })
  parser.on('done', function(err) {
    if (err) {
      console.log('parser error: ' + err);
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
          console.log('track find error: ' + err);
        } else {
          if (docs.length == 0) {
            console.log('Getting ID3 tags for ' + item.Key);
            id3_queue.push(item.Key, function(err) {
              console.log('finished processing ' + item.Key);
            })
          } else {
          }
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
          console.log('Error updating db_albums: ' + err);
        } else {
        }
      })
    })
  })
}


id3_queue.drain = create_albums;

s3.listObjects(s3_params, function(err, data) {
  if (err) {
    console.log(err);
  } else {
    process_s3_data(data);
  }
});

var app = express()

app.configure(function() {
  app.use(app.router)
  app.use('/', express.static(__dirname + '/public'))
})

app.get('/albums', function(req, res) {
  db_albums.find({}, function(err, docs) {
    if (err) {
      console.log('/albums error: ' + err);
      res.send(err);
    } else {
      res.send(docs);
    }
  });
})

app.get(/file\/(.+)/, function(req, res) {
  var key = req.params[0];
  var r;
  if (r = /.*\/(.*\.mp3)$/.exec(key)) {
    var file_name = r[1];
    var params = s3_params;
    params.Key = key;
    res.setHeader('Content-type', 'audio/mpeg3');
    s3.getObject(params).createReadStream().pipe(res);
  } else {
    res.send('key error')
  }
})

app.get(/id3\/(.+)/, function(req, res) {
 var key = req.params[0];
 db_tracks.findOne({key:key}, function(err, doc) {
   res.send(doc.id3);
 });
})

app.listen(config.port)
console.log('started on port ' + config.port)

