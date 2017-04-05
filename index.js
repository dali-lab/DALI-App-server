var express = require('express')
var mongoose = require('mongoose');
var app = express()
var bodyParser = require('body-parser')
var SharedUser = require('./SharedUser')
var TimLocation = require('./TimLocation')
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));
mongoose.connect(process.env.DB_URI);
mongoose.Promise = global.Promise;

app.post('/checkIn', function (req, res) {
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
  SharedUser.find({email: req.body.user.email}).then((users) => {
    users = users.filter((user) => {
      return user.email == req.body.user.email
    })

    if (users.length > 0) {
      var user = users[0];
      user.shared = req.body.share
      // Old to sharing
      if (req.body.share) {
        // Still sharing...
        // So update record
        user.inDALI = req.body.inDALI
      }

      user.save().then((user) => {
        res.send('Noted');
      })
    }else if (req.body.share){
      // New user to sharing
      var user = new SharedUser({
        email: req.body.user.email,
        name: req.body.user.name,
        inDALI: req.body.inDALI,
        shared: req.body.share
      })

      user.save().then((user) => {
        res.send('Noted');
      })
    }
  }).catch((error) => {
    res.send(error);
  })
})

app.get('/sharedUsersLocation', function(req, res) {
  SharedUser.find({shared: true, inDALI: true}).then((users) => {
    res.json(users);
  })
})

/**
 Post Tim's current location

 Sample req.body: {
    location: "OFFICE",
    enter: true
  }
 */
app.post('/timLocation', function (req, res) {
  console.log(req.body);
  TimLocation.find().then((locations) => {
    var loc = null;
    if (locations.length > 0) {
      loc = locations[0]
    }else{
      var loc = new TimLocation({
        inDALI: false,
        inOffice: false
      })
    }
    loc.inDALI = req.body.location == "DALI" && req.body.enter
    loc.inOffice = req.body.location == "OFFICE" && req.body.enter

    loc.save().then((loc) => {
      res.send('Noted')
    })
  })
})

app.get('/timLocation', function(req, res) {
  TimLocation.find().then((locations) => {
    if (locations.length > 0) {
      res.json(locations[0])
    }else{
      res.json({inDALI: false, inOffice: false})
    }
  })
})

app.listen(process.env.PORT, function () {
  console.log('DALI App Server listening on port ' + process.env.PORT + '!')
})
