MP3 Wrangler
============

Web application that can be used to browse and download mp3 files from Amazon S3.

![screenshot](https://raw.github.com/cbrake/mp3-wrangler/master/screenshot.png)

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

* nodejs
* expressjs
* bootstrap 3.0
* react 

Key files include:

* app.js (main nodejs app)
* public/index.html (main html file)
* public/js/app.js (react client side application)

The rest is just bits of above components.

Roadmap
-------

* create index of S3 key and ID3 tag data
* periodically rescan and look for new keys, if new keys found, extract ID3 tag data
* display based on tag data instead of file structure
* search features to search for tracks based on ID3 tags
* select albumns/tracks/artists and download in zip format (up to XXMB)
* integrate mp3 play such that albumns can be played in web browser



