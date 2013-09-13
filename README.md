MP3 Wrangler
============

Web application that can be used to browse and download mp3 files from Amazon S3.

![screenshot](https://raw.github.com/cbrake/mp3-wrangler/master/screenshot.png)

Features:

* builds a database of tracks and albums of mp3 files in a S3 bucket
* displays listing of albums
* optionally display tracks and track ID3 tags
* download individual tracks

Install
-------

1. Upload mp3 files to a S3 bucket with a directory structure of:
   * (Genre) -> (Artist) -> (Album) -> individual mp3 tracks
1. On a nodejs capable server:
   * git clone *https://github.com/cbrake/mp3-wrangler.git*
   * cd *mp3-wrangler*
   * cp *aws-config.json.sample* *aws-config.json*
   * edit *aws-config.json* with your AWS and port settings
   * node app.js

Operation
---------

This application uses the following components:

* server
    * nodejs
    * expressjs
    * nedb
    * aws-sdk
    * musicmetadata
* client
    * bootstrap 3.0
    * react 0.4.1

Key files include:

* app.js (server side nodejs app)
* public/index.html (main html file)
* public/js/main.js (client side application)

The rest is just bits of above components.

On startup, a listing of all files are fetched from the S3 bucket.  If the mp3 file is not
located in tracks.db, the file is fetched and the ID3 tags are parsed and stored in
tracks.db.  After the process of fetching any new track info is completed, the albumns.db
is updated which contains album information.

Roadmap
-------

* ~~create index of S3 key and ID3 tag data~~
* periodically rescan and look for new keys, if new keys found, extract ID3 tag data
* ~~display based on tag data instead of file structure~~
* search features to search for tracks based on ID3 tags
* select albumns/tracks/artists and download in zip format (up to XXMB)
* integrate mp3 player such that albums can be played in web browser

### Contributions: are welcome, use github.

### License: MIT

