var express = require('express')

var WebUi = module.exports = function(db_albums, db_tracks, port, source) {
  var app = express()

  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({secret: 'mp3-wrangler-1234'}));
  app.use(app.router);
  app.use('/', express.static(__dirname + '/public'));

  app.configure(function() {
  })

  app.get('/albums', function(req, res) {
    db_albums.find({}, function(err, docs) {
      if (err) {
        res.send(err);
        return console.log('/albums error: ' + err);
      }
      res.send(docs);
    });
  })

  app.get(/file\/(.+)/, function(req, res) {
    var key = req.params[0];
    var r;
    if (r = /.*\/(.*\.mp3)$/.exec(key)) {
      var file_name = r[1];
      res.setHeader('Content-type', 'audio/mpeg3');
      var stream = source.createReadFileStream(key);
      stream.on('end', function() {
        console.log('stream end: ' + key);
      });
      stream.pipe(res);
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

  app.post('/download-list', function(req, res) {
    req.session.albums = req.body.albums;
    res.send('ok');
  })

  app.get('/download-list', function(req, res) {
    if (!req.session.albums) {
      req.session.albums = []
    }
    res.send(req.session.albums);
  })

  app.get('/download', function(req, res) {
    if (!req.session.albums) {
      return res.send('no albums');
    }

    var download_stream = source.createDownloadStream(req.session.albums);

    res.setHeader('Content-disposition', 'attachment; filename=albums.zip');
    res.setHeader('Content-type', 'application/zip');
    download_stream.pipe(res);
  })

  app.listen(port)
  console.log('started on port ' + port)
}
