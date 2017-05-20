/**
* Controls voting.
*
* NOTE: Each function's parameters will also include an API key, which needs to be checked against process.env.API_KEY
*/

var express = require('express');
var router = express.Router();

// Getting configurations for these data models
var {VoteLog, VotingEvent, VotingEventOption} = require('./DBRecords/VotingEvent');

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
   console.log(req.body);
   if (req.query.key != process.env.API_KEY) {
      res.status(403).send("Unauthorized request. This method can only be called from the DALI Lab iOS or Android app");
      return;
   }

   if (req.body.name == undefined || req.body.name == "" || req.body.description == undefined || req.body.description == "" || req.body.options == undefined || !Array.isArray(req.body.options)) {
      res.status(400).send("Failed. Invalid data! " + JSON.stringify(req.body));
      return;
   }

   if (req.body.options.length <= 3) {
      res.status(400).send("Need more than 3 options");
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
         score: 0,
         award: null
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
   console.log("Getting...");
   if (req.query.key != process.env.API_KEY) {
      res.status(403).send("Unauthorized request. This method can only be called from the DALI Lab iOS or Android app");
      return;
   }
   console.log("Got here...");

   getCurrentEvent().then((event) => {
      if (event == null) {
         res.status(404).json("No data");
         return;
      }

      event.startTime = undefined;
      event.endTime = undefined;
      event.options.forEach((option) => {
         option.score = undefined;
         option.award = undefined;
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
   if (req.query.key != process.env.API_KEY) {
      res.status(403).send("Unauthorized request. This method can only be called from the DALI Lab iOS or Android app");
      return;
   }

   const eventID = req.body.event;
   if (eventID == null || eventID == "") {
      res.status(400).send("Failed! You must include the id of the event");
      return;
   }

   VoteLog.find({ ip: req.ip }).then((logs) => {
      if (logs.length > 0) {
         res.status(403).send("You can only vote once!");
         return;
      }

      VotingEvent.findById(eventID).then((event) => {
         if (event == null) {
            res.status(404).send("Event not found");
            return;
         }
         if (event.resultsReleased) {
            res.status(400).send("Event is no longer accepting votes");
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

         var voteLog = new VoteLog({
            event: event,
            first: null,
            second: null,
            third: null,
            user: user,
            ip: req.ip
         });

         function score(option, score, id) {
            if (option == null) {
               throw {message: "Vote option not found! " + id, code: 404}
            }

            option.score += score;
            return option.save();
         }

         VotingEventOption.findById(first).then((option) => {
            voteLog.first = option;
            return score(option, 3, first);
         }).then(() => {
            return VotingEventOption.findById(second);
         }).then((option) => {
            voteLog.second = option;
            return score(option, 2, second);
         }).then(() => {
            return VotingEventOption.findById(third);
         }).then((option) => {
            voteLog.third = option;
            return score(option, 1, third);
         }).then(() => {
            res.send("Complete");
            voteLog.save().then(() => {
               console.log("Saved vote log");
            });
         }).catch((error) => {
            res.status(error.code || 500).send(error.message);
         });
      });
   });
});

/**
* Releases the given results
*
* Parameters:
* {
*     event: 1, (id)
*     winners: [
*        {award: "Popular choice", id: kasjf;klsa jfl;kjaskld},
*        {award: "DALI award", id: kasjf;klsa jfl;kjaskld}
*     ],
* }
*
* Functionality:
*  - Set resultsReleased to be true
*  - Set results to be winners
*
*/
router.post('/release', function(req, res) {
   if (req.query.key != process.env.API_KEY) {
      res.status(403).send("Unauthorized request. This method can only be called from the DALI Lab iOS or Android app");
      return;
   }

   if (req.body.event == null || req.body.event == "" || req.body.winners == null || !Array.isArray(req.body.winners)) {
      res.status(400).send("Invalid data!");
      return;
   }

   if (req.body.winners.length < 1) {
      res.status(400).send("You need at least one winner!");
      return;
   }

   const eventID = req.body.event;
   const winnersObjs = req.body.winners;

   VotingEvent.findById(eventID).then((event) => {
      if (event == null) {
         res.status(404).send("Failed to find event!");
         return;
      }

      if (event.resultsReleased) {
         res.status(400).send("Event has already released results");
         return;
      }

      event.resultsReleased = true;

      var promises = [];
      winnersObjs.forEach((winnerObj) => {
         promises.push(
            new Promise(function(resolve, reject) {
               VotingEventOption.findById(winnerObj.id).then((winner) => {
                  if (winner == null) {
                     reject({code: 404, message: "Failed to find opton: " + winnerObj.id});
                  }
                  winner.award = winnerObj.award;
                  winner.save().then(resolve);
               }).catch((error) => {
                  reject({ code: 500, mesage: error});
               });
            })
         );
      });

      Promise.all(promises).then(() => {
         event.save().then(() => {
            res.send("Complete");
         });
      }).catch((error) => {
         if (error.code == 404) {
            res.status(error.code).send(error.message);
         }else{
            res.status(500).send(error);
         }
      })
   });
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
   if (req.query.key != process.env.API_KEY) {
      res.status(403).send("Unauthorized request. This method can only be called from the DALI Lab iOS or Android app");
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
         option.award = undefined;
      });

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
* [
*   {name: "Pitch 1", award: "Popular choice"},
*   {name: "Pitch 2", award: "DALI award"},
* ]
*/
router.get('/results/final', function(req, res) {
   if (req.query.key != process.env.API_KEY) {
      res.status(403).send("Unauthorized request. This method can only be called from the DALI Lab iOS or Android app");
      return;
   }

   var eventID = req.query.id;
   function getQuery() {
      if (eventID == null || eventID == "") {
         return VotingEvent.find({ startTime: {$lt: new Date()}, endTime: {$gt: new Date()} }).then((events) => {
            return new Promise(function(resolve, reject) {
               if (events == null) {
                  resolve(null);
                  return;
               }
               resolve(events[0]);
            });
         });
      }else{
         VotingEvent.findById(eventID)
      }
   }

   getQuery().then((event) => {
      if (event == null) {
         res.status(404).send("Event not found");
         return;
      }

      if (!event.resultsReleased) {
         res.status(400).send("Event has not released results yet!");
         return;
      }

      var errors = [];
      var options = [];
      var promises = [];
      event.options.forEach((optionID) => {
         promises.push(new Promise(function(resolve, reject) {
            VotingEventOption.findById(optionID).then((option) => {
               if (option == null) {
                  errors.push(optionID);
                  return;
               }

               option.score = undefined;
               if (option.award != null) {
                  options.push(option);
               }
               resolve();
            });
         }));
      });

      Promise.all(promises).then(() => {
         if (errors.length > 0) {
            errors.forEach((errorID) => {
               var i = event.options.indexOf(errorID);
               if (i >= 0) {
                  event.options.splice(i, 1);
               }
            });
            event.save().then(() => {
               console.log("Cleaned up " + errors.length + " broken links", errors);
            });
         }

         res.json(options);
      });
   });
});

module.exports = router;
