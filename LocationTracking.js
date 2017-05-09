var express = require('express');
var router = express.Router();
var schedule = require('node-schedule');

// Getting configurations for these data models
var SharedUser = require('./SharedUser')
var TimLocation = require('./TimLocation')

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
router.post('/enterExit', function (req, res) {
   console.log(req.body);
   if (req.body.user == undefined || req.body.user.email == undefined || req.body.user.email == "") {
      res.status(500).send("Failed, you need a user object and email: " + JSON.stringify(req.body));
      return;
   }

   console.log("Enter exit...", req.body);
   // Getting the user from the db...
   SharedUser.find({email: req.body.user.email}).then((users) => {
      // Make certain I have no extra users
      users = users.filter((user) => {
         return user.email == req.body.user.email;
      });

      console.log("Matching users:", users);

      if (users.length > 0) {
         // If there is a user I would like to update it
         var user = users[0];
         user.shared = req.body.share;
         console.log("Shared is now:", user.shared);

         // If you are just now turning it on, I will save your location too
         if (req.body.share) {
            user.inDALI = req.body.inDALI;

            console.log("Starting interval...");
            if (req.body.inDALI) {
               setInterval(function() {
                  console.log("Interval...");
                  if (user.lastUpdate - new Date() >= 1000 * 60 * 30) {
                     // We have received no update since
                     user.inDALI = false;
                     user.save().then(() => {});
                     console.log("Cancelling inDALI...");
                  }
               }, 1000 * 60 * 30);
            }
         }

         user.lastUpdate = new Date();
         user.name = req.body.user.name;

         // Save...
         console.log("Saving user...");
         user.save().then((user) => {
            console.log("Done");
            res.send('Noted');
         });
      }else if (req.body.share){
         console.log("New user...");
         // This user is new to sharing. I will create a new record with their data
         var user = new SharedUser({
            email: req.body.user.email,
            name: req.body.user.name,
            inDALI: req.body.inDALI,
            shared: req.body.share,
            lastUpdate: new Date()
         });

         // And save...
         console.log("Saving user...");
         user.save().then((user) => {
            console.log("Done");
            res.send('Noted');
         });
      }else{
         res.send("Noted");
      }
   }).catch((error) => {
      console.error("Encountered an error running enterExit!");
      console.error(error);
      res.send(error);
   });
});

function resetLocations() {
   return SharedUser.find().then((users) => {
      var promises = [];

      users.forEach((user) => {
         user.inDALI = false;
         promises.push(user.save());
      });

      return Promise.all(promises)
   }).then(() => {
      return TimLocation.find()
   }).then((tims) => {
      var promises = []

      tims.forEach((tim) => {
         tim.inDALI = false;
         tim.inOffice = false;
         promises.push(tim.save());
      });

      return Promise.all(promises)
   });
}

router.post("/reset", function(req, res) {
   resetLocations().then(() => {
      res.send("Complete!");
   }).catch((error) => {
      res.send("Failed! " + error);
   });
});

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
router.get('/shared', function(req, res) {
   SharedUser.find({shared: true, inDALI: true}).then((users) => {
      console.log(users);
      res.json(users.filter((user) => {
         return user.email != null
         && user.name != null
         && user.email != ""
         && user.name != "";
      }));
   })
});

/**
Post Tim's current location

PARAMETERS: {
location: "OFFICE",
enter: true
}
*/
router.post('/tim', function (req, res) {
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
});

/**
Get Tim's last known location

RETURNS: {
inDALI: Bool,
inOffice: Bool,
}
*/
router.get('/tim', function(req, res) {
   TimLocation.find().then((locations) => {
      if (locations.length > 0) {
         // Return the record
         res.json(locations[0])
      }else{
         // No record. Report unknown
         res.json({inDALI: false, inOffice: false})
      }
   })
});

module.exports = router;
