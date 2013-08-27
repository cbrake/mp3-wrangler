var express = require('express')
var AWS = require('aws-sdk')

AWS.config.loadFromPath('./aws-config.json')

var s3 = new AWS.S3();

params = {
  Bucket:'becsws'
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
    if (r = /(.*)\/(.*)\/(.*)\/(.*\.mp3$)/.exec(item.Key)) {
      var file = r[4];
      var s = {
        genre:r[1],
        artist:r[2],
        album:r[3],
        files:[]
      }
      var key = s.genre + '/' + s.artist + '/' + s.album;
      if (albums.hasOwnProperty(key)) {
        albums[key].files.push(file);
      } else {
        albums[key] = s;
      }
    }
  })
}

s3.listObjects(params, function(err, data) {
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

port = 8025
app.listen(port)
console.log("started on port " + port)

