/**
* Controls voting.
*
* NOTE: Each function's parameters will also include an API key, which needs to be checked against process.env.API_KEY
*/

var express = require('express');
var router = express.Router();

// Getting configurations for these data models
var {VotingEvent, VotingEventOption} = require('./DBRecords/VotingEvent');

/**
* Creates a event and saves it

* Parameters:
* {
*     name: "The Pitch",
*     description: "You have now seen many pitches, so now please choose the three that you think showed the most merit in your opinion.",
*     image: "https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F30750478%2F73808776949%2F1%2Foriginal.jpg?w=1000&rect=38%2C0%2C1824%2C912&s=068ff06280148aa18a9075a68ad6e060"
*        (allow this one to not be here, defaulting to this value),
*     options: [ //STUFF THAT GOES INTO THE EVENTOPTION
*        "Pitch 1",
*        "Pitch 2",
*     ],
*     startTime: Date (allow this one to not be here, defaulting to now),
*     endTime: Date (allow this one to not be here, defaulting to midnight)
* }

* Should also add the following values:
* resultsReleased: true
*/


router.post('/create', function (req, res) {
   if (req.body.name == undefined || req.body.name == "" || req.body.description == undefined || req.body.description == "" || req.body.options == undefined || !Array.isArray(req.body.options)) {
      res.status(400).send("Failed. Invalid data! " + JSON.stringify(req.body));
      return;
   }

   if (req.body.options.length <= 3) {
      res.status(400).send("Need more than 3 options");
      return;
   }

   // This should be in all of them
   if (req.body.API_KEY != process.env.API_KEY) {
      res.status(403).status("Unauthorized request. This method can only be called from the DALI Lab iOS or Android app");
      return;
   }

   var startTime = new Date()
   var endTime = new Date()
   endTime.setHours(23, 59, 59);

   if (req.body.startTime != null) {
      startTime = new Date(req.body.startTime);
   }
   if (req.body.endTime != null) {
      endTime = new Date(req.body.endTime);
   }

   if (endTime <= startTime) {
      res.status(400).send("End time must be later than start time!");
      return;
   }

   //loop through req.body.options and create votingEventOptions objects
   var optionsSavePromises = [];
   var votingEventOptions = req.body.options.map((option) => {
      option = new VotingEventOption({
         //_id: //fairly certain mongoose generates own _id. Do we save this into DB?
         //Or store evenOption into event.options and just save events.options?
         // Yeah, I realized it doesn't autogen with numbered ids, so I switched back
         name: option,
         score: 0
      });

      optionsSavePromises.push(option.save());
      return option;
   });

   // To make sure they are all saved before we continue...
   Promise.all(optionsSavePromises).then(() => {

      // Create the event
      var event = new VotingEvent({
         name: req.body.name,
         image: req.body.image || "https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F30750478%2F73808776949%2F1%2Foriginal.jpg?w=1000&rect=38%2C0%2C1824%2C912&s=068ff06280148aa18a9075a68ad6e060",
         description: req.body.description,
         startTime: startTime,
         endTime: endTime,
         resultsReleased: false,
         options: votingEventOptions,
         results: []
      });

      // And we're done
      event.save().then((event) => {
         console.log("New event created!");
         res.send("Complete");
      }).catch((error) => {
         console.log(error);
         res.status(500).send(error);
      });
   }).catch((error) => {
      console.log(error);
      res.status(500).send(error);
   });
});

/**
* Returns the event object whos start time is before now and end time is after now.
*/
router.get('/current', function(req, res) {
   if (req.body.API_KEY != process.env.API_KEY) {
      res.status(403).status("Unauthorized request. This method can only be called from the DALI Lab iOS or Android app");
      return;
   }

   getCurrentEvent().then((event) => {
      if (event == null) {
         res.json("No data");
         return;
      }

      event.startTime = undefined;
      event.endTime = undefined;
      event.options.forEach((option) => {
         option.score = undefined;
      });

      res.json(event);
   });
});

function getCurrentEvent() {
   return new Promise(function(resolve, reject) {
      const now = Date();
      VotingEvent.find({ startTime: {$lt: now}, endTime: {$gt: now} }).then((results) => {
         if (results != null && results.length > 0) {
            var event = results[0];
            var options = [];
            var promises = [];
            event.options.forEach((optionID) => {
               promises.push(new Promise(function(success, failure) {
                  VotingEventOption.findById(optionID).then((option) => {
                     if (option == null) {
                        // Failed to find this option, so something broke.
                        // I will attempt to recover
                        console.log("Discovered broken link! Recovering...");
                        var i = event.options.indexOf(optionID);
                        if (i >= 0) {
                           event.options.splice(i, 1);
                           event.save().then(() => {
                              console.log("Fixed broken link");
                           }).catch((error) => {
                              console.error("Failed to recover! ", error);
                           });
                        }
                        return;
                     }
                     options.push(option);
                     success();
                  });
               }));
            });
            Promise.all(promises).then(() => {
               event.options = options;
               resolve(event);
            });
         }else{
            resolve(null);
         }
      });
   });
}

/**
* Makes note of a user's votes, adding the appropriate score to each VotingEventOption object
*
* Parameters:
* {
*     event: 591f43fa1afecb535cbcc394,
*     first: 591f43f91afecb535cbcc390,
*     second: 591f43f91afecb535cbcc392,
*     third: 591f43f91afecb535cbcc391,
*     user: "john.kotz@dali.dartmouth.edu" (optional value)
* }
*
*
* Other functionality:
*  - Add a line to a google spreadsheet including event name and user if the user value is not empty
*
*
* Scoring:
* - 1st choice: 3 points
* - 2nd choice: 2 points
* - 3rd choice: 1 point
*/
router.post('/submit', function(req, res) {
   if (req.body.API_KEY != process.env.API_KEY) {
      res.status(403).status("Unauthorized request. This method can only be called from the DALI Lab iOS or Android app");
      return;
   }

   const first = req.body.first;
   const second = req.body.second;
   const third = req.body.third;
   const user = req.body.user;

   if (first == null || first == "" || second == null || second == "" || third == null || third == "") {
      res.status(400).send("Failed! One of them is missing!");
      return;
   }

   function score(option, score, id) {
      if (option == null) {
         throw {message: "Vote option not found! " + id, code: 404}
      }

      option.score += score;
      return option.save();
   }

   VotingEventOption.findById(first).then((option) => {
      return score(option, 3, first);
   }).then(() => {
      return VotingEventOption.findById(second);
   }).then((option) => {
      return score(option, 2, second);
   }).then(() => {
      return VotingEventOption.findById(third);
   }).then((option) => {
      return score(option, 1, third);
   }).then(() => {
      res.send("Complete");
   }).catch((error) => {
      res.status(error.code || 500).send(error.message);
   });
});

/**
* Releases the given results
*
* Parameters:
* {
*     event: 1, (id)
*     winners: [
*        {name: "Pitch 1", award: "Popular choice"},
*        {name: "Pitch 2", award: "DALI award"}
*     ],
* }
*
* Functionality:
*  - Set resultsReleased to be true
*  - Set results to be JSON.stringify(winners)
*
*/
router.post('/release', function(req, res) {
   if (req.body.API_KEY != process.env.API_KEY) {
      res.status(403).status("Unauthorized request. This method can only be called from the DALI Lab iOS or Android app");
      return;
   }

});

/**
* Get the current scores of all options
* Should only be called by Admins
*
* Returns:
* {
*     options: [
*        {name: "Pitch 1", id: 1, score: 21}
*     ]
* }
*
* Returns null if results are already released for the current event
*/
router.get('/results/current', function(req, res) {
   if (req.body.API_KEY != process.env.API_KEY) {
      res.status(403).status("Unauthorized request. This method can only be called from the DALI Lab iOS or Android app");
      return;
   }

   getCurrentEvent().then((event) => {
      if (event == null) {
         res.json("No data");
         return;
      }

      event.startTime = undefined;
      event.endTime = undefined;

      res.json(event);
   });
});

/**
* Get the final results
*
* Basic functionality:
*  - return JSON.parse(results)
*
* Returns:
* {
*     event: "The Pitch",
*     winners: JSON.parse(results) aka [ {name: "Pitch 1", award: "Popular choice"} ]
* }
*/
router.get('/results/final', function(req, res) {
   if (req.body.API_KEY != process.env.API_KEY) {
      res.status(403).status("Unauthorized request. This method can only be called from the DALI Lab iOS or Android app");
      return;
   }

});

module.exports = router;
