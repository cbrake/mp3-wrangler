var express = require('express')
  , flash = require('connect-flash')
  , passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , config = require('./config.json')
  , util = require('util');


function findById(id, fn) {
  var idx = id - 1;
  if (config.users[idx]) {
    fn(null, config.users[idx]);
  } else {
    fn(new Error('User ' + id + ' does not exist'));
  }
}

function findByUsername(username, fn) {
  for (var i = 0, len = config.users.length; i < len; i++) {
    var user = config.users[i];
    if (user.username === username) {
      return fn(null, user);
    }
  }
  return fn(null, null);
}

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  findById(id, function (err, user) {
    done(err, user);
  });
});

// Use the LocalStrategy within Passport.
//   Strategies in passport require a `verify` function, which accept
//   credentials (in this case, a username and password), and invoke a callback
//   with a user object.  In the real world, this would query a database;
//   however, in this example we are using a baked-in set of users.
passport.use(new LocalStrategy(
  function(username, password, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      
      // Find the user by username.  If there is no user with the given
      // username, or the password is not correct, set the user to `false` to
      // indicate failure and set a flash message.  Otherwise, return the
      // authenticated `user`.
      findByUsername(username, function(err, user) {
        if (err) { return done(err); }
        if (!user) { return done(null, false, { message: 'Unknown user ' + username }); }
        if (user.password != password) { return done(null, false, { message: 'Invalid password' }); }
        return done(null, user);
      })
    });
  }
));

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}


var WebUi = module.exports = function(db_albums, db_tracks, port, source) {
  var app = express()

  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  //app.use(express.logger());
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({secret: 'mp3-wrangler-1234', search: {artist: '', album: '', tags: ''}}));
  app.use(flash());
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use('/', express.static(__dirname + '/public'));

  app.configure(function() {
  })

  app.get('/', ensureAuthenticated, function(req, res) {
    if (!req.session.search) {
      console.log("Search is not set, this should not happen!");
      req.session.search = {artist: '', album: '', tags: ''};
    }
    console.log('sending index.html');
    res.sendfile('public/index.html', { user: req.user });
  });

  app.get('/login', function(req, res) {
    res.render('login', { user: req.user, message: req.flash('error') });
  });

  app.post('/login',
    passport.authenticate('local', { failureRedirect: '/login', failureFlash: true}),
    function(req, res) {
      res.redirect('/');
    });

  app.get('/albums/:page', function(req, res) {
    console.log('/albums/' + req.params.page + ', search = ' + util.inspect(req.session.search));
    var itemsPerPage = 10;
    var find = {};
    if (req.session.search.artist !== '') {
      find["key"] = { $regex: new RegExp(req.session.search.artist, 'i')};
    }
    db_albums.count(find, function(err, count) {
      db_albums.find(find).sort({key: 1}).skip(req.params.page - 1).limit(itemsPerPage).exec(function(err, docs) {
        pages = Math.ceil(count/itemsPerPage);
        if (err) {
          res.send(err);
          return console.log('/albums error: ' + err);
        }
        res.send({albums: docs, pages: pages, page: req.page});
      });
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
      stream.on('error', function() {
        console.log('Error streaming ' + key);
        res.send(500, 'stream error');
      });
      stream.pipe(res);
    } else {
      res.send(500, 'key error')
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

  app.post('/search', function(req, res) {
    console.log("Search: " + util.inspect(req.body.search));
    req.session.search = req.body.search;
    res.send('ok');
  })

  app.get('/search', function(req, res) {
    if (!req.session.search) {
      req.session.search = { artist: '', album: '', tags: ''};
    }
    res.send(req.session.search);
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
    
    // FIXME: the following does not work
    download_stream.on('error', function() {
      res.send(500, 'Stream error');
    });
    
    res.setHeader('Content-disposition', 'attachment; filename=albums.zip');
    res.setHeader('Content-type', 'application/zip');
    download_stream.pipe(res);
  })

  app.listen(port)
  console.log('started on port ' + port)
}
