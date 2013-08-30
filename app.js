var express = require('express')
var AWS = require('aws-sdk')
var fs = require('fs')

// local modules
var config = require('./aws-config.json')

console.log(config)

AWS.config.loadFromPath('./aws-config.json')

var s3 = new AWS.S3();

var s3_params = {
  Bucket:config.bucket
}

var s3_dir_value = false

// album - (Object)
//   genre - (String)
//   artist - (String)
//   album - (String)
//   files - (Array<String>) S3 key

// albums - (Object<String:album>) key is genre/artist/album, album is album object
var albums = {}

// artist_index - (Object<String:Array<String>>) key is artist, value is array of genre/artist/album
var artist_index = {}

function process_s3_data(data) {
  if (data.IsTruncated === true) {
    console.log("WARNING: S3 data is tructated");
  }

  data.Contents.forEach(function(item) {
    console.log(item.Key);
    var r;
    if (r = /(.*)\/(.*)\/(.*)\/(.*\.mp3$)/.exec(item.Key)) {
      var file = r[4];
      var s = {
        genre:r[1],
        artist:r[2],
        album:r[3],
        files:[{key:item.Key, name:file}]
      }
      var key = s.genre + '/' + s.artist + '/' + s.album;
      if (albums.hasOwnProperty(key)) {
        albums[key].files.push({key:item.Key, name:file});
      } else {
        albums[key] = s;
      }
    }
  })
}

s3.listObjects(s3_params, function(err, data) {
  if (err) {
    console.log(err);
  } else {
    //console.log(data);
    process_s3_data(data);
    console.log(albums);
  }
});

var app = express()

app.configure(function() {
  app.use(app.router)
  app.use('/', express.static(__dirname + '/public'))
})

app.get('/albums', function(req, res) {
  res.send(albums);
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

port = 8025
app.listen(port)
console.log("started on port " + port)

