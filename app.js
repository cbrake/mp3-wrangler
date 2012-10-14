var express = require('express')


var app = express()

app.configure(function() {
  app.use(app.router)
  app.use('/', express.static(__dirname + '/public'))
})

app.listen(8025)

