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

Roadmap
-------


