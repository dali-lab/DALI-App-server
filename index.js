/**
 DALI Lab app server: index.js

 Runs a simple GET and POST server

 AUTHOR: John Kotz
 Copyright (c) 2017 DALI Lab All Rights Reserved.
 */


var express = require('express')
var mongoose = require('mongoose');
var bodyParser = require('body-parser')
require('dotenv').config()

// Getting configurations for these data models
var SharedUser = require('./SharedUser')
var TimLocation = require('./TimLocation')


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

/**
 Called upon entering or exiting the DALI lab (and when some settings are changed)

 Sample req.params:
   {
    user: {
      email: 'john.kotz@dali.dartmouth.edu',
      id: '123456789012345678901',
      familyName: 'Kotz',
      givenName: 'John',
      name: 'John Kotz'
    },
    inDALI: false,
    share: false
  }
 */
app.post('/enterExit', function (req, res) {
  // Getting the user from the db...
  SharedUser.find({email: req.body.user.email}).then((users) => {
    // Make certain I have no extra users
    users = users.filter((user) => {
      return user.email == req.body.user.email;
    });

    if (users.length > 0) {
      // If there is a user I would like to update it
      var user = users[0];
      user.shared = req.body.share;


      // If you are just now turning it on, I will save your location too
      if (req.body.share) {
        user.inDALI = req.body.inDALI;
      }

      // Save...
      user.save().then((user) => {
        res.send('Noted');
      });
    }else if (req.body.share){
      // This user is new to sharing. I will create a new record with their data
      var user = new SharedUser({
        email: req.body.user.email,
        name: req.body.user.name,
        inDALI: req.body.inDALI,
        shared: req.body.share
      });

      // And save...
      user.save().then((user) => {
        res.send('Noted');
      });
    }
  }).catch((error) => {
    console.error("Encountered an error running enterExit!");
    console.error(error);
    res.send(error);
  });
})

/**
 Get a list of users in the lab who share their location

 RETURNS:
  [
    {
      email: String,
      name: String,
      inDALI: Bool,
      shared: Bool
    }
  ]
 */
app.get('/sharedUsersLocation', function(req, res) {
  SharedUser.find({shared: true, inDALI: true}).then((users) => {
    res.json(users);
  })
})

/**
 Post Tim's current location

 PARAMETERS: {
    location: "OFFICE",
    enter: true
  }
 */
app.post('/timLocation', function (req, res) {
  // Get the last entry
  TimLocation.find().then((locations) => {
    // Create a placeholder to put the correct record into
    var loc = null;

    if (locations.length > 0) {
      // If there is one already...
      loc = locations[0]
    }else{
      // If there isn't one already, create new one.
      var loc = new TimLocation({
        inDALI: false,
        inOffice: false
      })
    }

    // With the record, store the enter value in the relevant value
    if (req.body.location == "DALI") {
      loc.inDALI = req.body.enter
    }else if (req.body.location == "OFFICE") {
      loc.inOffice = req.body.enter
    }

    // Save...
    loc.save().then((loc) => {
      res.send('Noted')
    })
  })
})

/**
 Get Tim's last known location

 RETURNS: {
   inDALI: Bool,
   inOffice: Bool,
  }
 */
app.get('/timLocation', function(req, res) {
  TimLocation.find().then((locations) => {
    if (locations.length > 0) {
      // Return the record
      res.json(locations[0])
    }else{
      // No record. Report unknown
      res.json({inDALI: false, inOffice: false})
    }
  })
})

// Start the server
app.listen(process.env.PORT, function () {
  console.log('DALI App Server listening on port ' + process.env.PORT + '!')
})
