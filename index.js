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

// Do the safety dance!
app.all('/voting/*', function (req, res, next) {
   // The following comments describe this function in the context of the movie Mission Impossible
   // This is an important request! Go secure
   // Going secure now...
   if (req.query.key != process.env.API_KEY) {
      // Failed to go secure
      if (req.query.key != null && req.query.key.length > 1) {
         // Your telephone box is probably out of date. We'll send a technician now...
         res.status(403).send("You app is out of date. Update it to comunicate with the server");
         return;
      }
      // You aren't Tom Cruse! How'd you get this number!
      res.status(403).send("Unauthorized request. This method can only be called from the DALI Lab iOS or Android app");
      return;
   }
   // Line is secure. Continue...
   next();
});

app.use('/location', require('./LocationTracking'));
app.use('/voting', require('./Voting'));


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
