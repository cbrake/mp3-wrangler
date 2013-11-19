var Datastore = require('nedb')

// local modules
var webui = require('./webui')
var config = require('./config.json')
var SourceS3 = require('./source-s3.js')
var SourceManager = require('./sourcemanager.js')

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

var source = new SourceS3(config.s3Config);
var source_manager = new SourceManager(db_albums, db_tracks, source);
var ui = new webui(db_albums, db_tracks, config.port, source_manager);

source_manager.update()

