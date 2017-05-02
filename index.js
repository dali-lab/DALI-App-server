/**
 DALI Lab app server: index.js

 Runs a simple GET and POST server

 AUTHOR: John Kotz
 Copyright (c) 2017 DALI Lab All Rights Reserved.
 */


var express = require('express')
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
require('dotenv').config();

// Starting the app
var app = express()
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

// Connect to the DB
mongoose.connect(process.env.DB_URI);
// This part is just because I prefer to use default Promises
//  and not the mongoose type
mongoose.Promise = global.Promise;

app.use('/location', require('./LocationTracking'));

/**
 Check the passed user into any event going on currently

 PARAMETERS:
  {
    user: {
      name: String,
      id: String,
      email: String
    },
    beacon: {
      major: Int,
      minor: Int
    }
  }

 NOTE: ATM doesn't do anything
 */
app.post('/checkIn', function (req, res) {
  // TODO: Check in the user!
  console.log(req.body);
  res.send('Noted');
})

// Start the server
app.listen(process.env.PORT, function () {
  console.log('DALI App Server listening on port ' + process.env.PORT + '!')
})
