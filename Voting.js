/**
* Controls voting.
*
* NOTE: Each function's parameters will also include an API key, which needs to be checked against process.env.API_KEY
*
* Copyright (c) 2017 John Kotz and DALI Lab All Rights Reserved.
*/


var express = require('express');
var router = express.Router();

// Getting configurations for these data models
var {VoteLog, VotingEvent, VotingEventOption} = require('./DBRecords/VotingEvent');

const defaultImage = "https://github.com/dali-lab/Dali-App/raw/vote-order/components/Assets/pitchLightBulb.png"

/**
* Creates a event and saves it

* Parameters:
* {
*     name: "The Pitch",
*     description: "You have now seen many pitches, so now please choose the three that you think showed the most merit in your opinion.",
*     image: "https://github.com/dali-lab/Dali-App/raw/vote-order/components/Assets/pitchLightBulb.png"
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
   // Check the data
   if (req.body.name == undefined || req.body.name == "" || req.body.description == undefined || req.body.description == "" || req.body.options == undefined || !Array.isArray(req.body.options)) {
      res.status(400).send("Failed. Invalid data!");
      return;
   }

   // More checking
   if (req.body.options.length <= 3) {
      res.status(400).send("Need more than 3 options");
      return;
   }

   // Default times are starting now and ending at midnight
   var startTime = new Date()
   var endTime = new Date()
   endTime.setHours(23, 59, 59);

   // Get the start and end times
   if (req.body.startTime != null) {
      startTime = new Date(req.body.startTime);
   }
   if (req.body.endTime != null) {
      endTime = new Date(req.body.endTime);
   }

   // Assert that end time is after start time. If not...
   if (endTime <= startTime) {
      res.status(400).send("End time must be later than start time!");
      return;
   }

   // Create the event
   var event = new VotingEvent({
      name: req.body.name,
      image: req.body.image || defaultImage,
      description: req.body.description,
      startTime: startTime,
      endTime: endTime,
      resultsReleased: false,
      options: null,
   });

   event.save().then((event) => {

      //loop through req.body.options and create votingEventOptions objects
      var optionsSavePromises = [];
      var votingEventOptions = req.body.options.map((option) => {
         // For each value in the body.options we will create a corresponding monoose object

         option = new VotingEventOption({
            name: option,
            score: 0,
            awards: null,
            event: event
         });

         // And remember its save promise so we can save them all later
         optionsSavePromises.push(option.save());
         return option;
      });

      // This will .then all the promisses in this array and resolve when they are all done
      return Promise.all(optionsSavePromises).then(() => {
         event.options = votingEventOptions;
         return event.save();
      });
   }).then(() => {
      // And we're done
      res.send("Complete");
   }).catch((error) => {
      console.log(error);
      res.status(500).send(error);
   });
});

/**
* Returns the event object whos start time is before now and end time is after now.
*/
router.get('/current', function(req, res) {
   // I wrote a function just for this moment
   getCurrentEvent().then((event) => {
      if (event == null) {
         res.status(404).json("No data");
         return;
      }

      // Stripping data the user shouldn't be getting
      event.startTime = undefined;
      event.endTime = undefined;
      event.options.forEach((option) => {
         option.score = undefined;
         option.award = undefined;
         option.event = undefined;
      });

      res.json(event);
   }).catch((error) => {
      res.status(500).send(error);
   });
});

/**
* Gets the current event through a promise.
* Yeah, I know this isn't a route. Its just a function. Just a simple normal function
*
* It takes no arguments
* Returns:
*     - event: This is not the event you are looking for (actually it is)
*/
function getCurrentEvent() {
   return new Promise(function(resolve, reject) {
      const now = Date();

      // I'm grabbing all times that have a start time less than now and end time greater than now
      // AKA: I'm finding events happening now
      VotingEvent.find({ startTime: {$lt: now}, endTime: {$gt: now} }).then((results) => {
         if (results != null && results.length > 0) {
            // We have lift off!
            var event = results[0];
            var options = [];
            var promises = [];

            // Now we just need to get all the options data
            event.options.forEach((optionID) => {
               // Again, this is a clever way of running all the get promises at once
               promises.push(
                  new Promise(function(success, failure) {
                     VotingEventOption.findById(optionID).then((option) => {
                        // Got the option
                        if (option == null) {
                           // Failed to find this option, so something broke.
                           // I will attempt to recover
                           console.log("Discovered broken link! Recovering...");
                           var i = event.options.indexOf(optionID);
                           if (i >= 0) {
                              // I will attempt to remove it from database
                              event.options.splice(i, 1);
                              // And... save...
                              event.save().then(() => {
                                 // All fixed. Now we can continue without adding it to the array
                                 // Really we have just cleaned a broken link WHILE getting the data!
                                 // How awesome!
                                 console.log("Fixed broken link");
                                 success();
                              }).catch((error) => {
                                 // Well... that didn't work :<(
                                 console.error("Failed to fix broken link! ", error);
                                 failure(error);
                              });
                           }
                           return;
                        }
                        options.push(option);
                        success();
                     });// End VotingEventOption.findById

                  })// End Promise

               );// End promises.push

            });// End forEach

            // Now we do them all!
            Promise.all(promises).then(() => {
               // Hopefully we did it!
               event.options = options;
               resolve(event);
            });
         }else{
            // Didn't find an event now
            resolve(null);
         }
      }).catch((error) => {
         // Something went very wrong! Perhaps we failed for fix a broken link
         reject(error);
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
* - 1st choice: 5 points
* - 2nd choice: 3 points
* - 3rd choice: 1 point
*/
const points = [5, 3, 1]
router.post('/submit', function(req, res) {
   const eventID = req.body.event;
   // Check it...
   if (eventID == null || eventID == "") {
      res.status(400).send("Failed! You must include the id of the event");
      return;
   }
   // Its legit

   // Check IP address. Each time someone votes a record is made, including their IP address ;)
   VoteLog.find({ ip: req.ip }).then((logs) => {
      if (logs.length > 0) {
         // If there are indeed any records with this IP, we should check to see if it is for this event:
         var i = 0;
         while (i < logs.length) {
            let log = logs[i];
            if (log.event == eventID) {
               // This IP address already voted for this event!
               res.status(405).send("You can only vote once!");
               return;
            }
         }
      }

      // Now we can pull the event...
      VotingEvent.findById(eventID).then((event) => {
         // And if we can't find it: 404
         if (event == null) {
            res.status(404).send("Event not found");
            return;
         }
         // We should also reject votes for events that are released
         if (event.resultsReleased) {
            res.status(400).send("Event is no longer accepting votes");
            return;
         }

         // FINALLY, we can get to the actual scoring
         const first = req.body.first;
         const second = req.body.second;
         const third = req.body.third;
         const user = req.body.user;

         // PSYCH! We have more things to check
         if (first == null || first == "" || second == null || second == "" || third == null || third == "") {
            res.status(400).send("Failed! One of them is missing!");
            return;
         }

         // And save the vote for later
         var voteLog = new VoteLog({
            event: event,
            first: null,
            second: null,
            third: null,
            user: user,
            ip: req.ip
         });

         /// A functon for scoring a given option with a score
         function score(option, score, id) {
            option.score += score;
            return option.save();
         }

         // Now we can finally get to scoring...
         var options = [];
         function handleOption(option) {
            if (option == null) {
               throw {message: "Vote option not found! " + option.id, code: 404}
               return;
            }
            options.push(option);
         }
         VotingEventOption.findById(first).then((option) => {
            handleOption(option);
            return VotingEventOption.findById(second);
         }).then((option) => {
            handleOption(option);
            return VotingEventOption.findById(third);
         }).then((option) => {
            handleOption(option);
            // Now we have succeeded in getting them all, so we can score
            var promises = [];
            const voteNames = ["first", "second", "third"];
            for (var i = 0; i < options.length; i++) {
               promises.push(score(options[i], points[i]));
               voteLog[voteNames[i]] = options[i];
            }

            // Julie, do the thing
            return Promise.all(promises);
         }).then(() => {
            res.send("Complete");
            voteLog.save().then(() => {});
         }).catch((error) => {
            res.status(error.code || 500).send(error.message);
         });
      });
   });
});

/**
* Releases the saved results
*
* Parameters:
* {
*     event: 1, (id)
* }
*
* Functionality:
*  - Set resultsReleased to be true
*
*/
router.post('/release', function(req, res) {
   // Input checking
   if (req.body.event == null || req.body.event == "") {
      res.status(400).send("Invalid data!");
      return;
   }

   const eventID = req.body.event;

   // Get the event
   VotingEvent.findById(eventID).then((event) => {
      if (event == null) {
         res.status(404).send("Failed to find event!");
         return;
      }

      // Can't release twice
      if (event.resultsReleased) {
         res.status(400).send("Event has already released results");
         return;
      }
      VotingEventOption.find({ award: { $ne: null }, "awards.0": { "$exists": true }, event: event }).then((awardOptions) => {
         if (awardOptions == null || awardOptions.length != 0) {
            res.status(400).send("You need at least one winner!");
            return;
         }

         // Save release
         event.resultsReleased = true;

         // And finaly save the event
         event.save().then(() => {
            res.send("Complete");
         }).catch((error) => {
            res.status(error.code || 500).send(error);
         });
      });
   });
});

/**
* Saves the given results
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
*  - Set results to be winners
*
*/
router.post('/results/save', function(req, res) {
   // Input checking
   if (req.body.event == null || req.body.event == "" || req.body.winners == null || !Array.isArray(req.body.winners)) {
      res.status(400).send("Invalid data!");
      return;
   }

   // Check for winners
   if (req.body.winners.length < 1) {
      res.status(400).send("You need at least one winner!");
      return;
   }

   const eventID = req.body.event;
   const winnersObjs = req.body.winners;

   var awards = {};
   winnersObjs.forEach((winnerObj) => {
      if (awards[winnerObj.id] == null) {
         awards[winnerObj.id] = []
      }
      awards[winnerObj.id].push(winnerObj.award);
   });

   // Get the event
   VotingEvent.findById(eventID).then((event) => {
      if (event == null) {
         res.status(404).send("Failed to find event!");
         return;
      }

      VotingEventOption.find(/*{ event: event }*/).then((options) => {
         var promises = [];
         options.forEach((option) => {
            option.awards = awards[option.id];
            promises.push(option.save());
         });

         Promise.all(promises).then(() => {
            res.send("Complete");
         });
      });
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

   // I already have a handy function, I just need to handle the data differently
   getCurrentEvent().then((event) => {
      if (event == null) {
         res.status(404).send("No data");
         return;
      }

      // Strip the same data except for the score
      event.startTime = undefined;
      event.endTime = undefined;
      event.options.forEach((option) => {
         option.award = undefined;
         option.event = undefined;
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
   // I use query here so they can include the event they are looking for in their url for the GET like this:
   // https://someserver.com/results/final?event=sa2f32wfi3w8n9naf8q389nas98f34nsd
   var eventID = req.query.id;

   /// A function to get the promise I want to use
   function getQuery() {
      if (eventID == null || eventID == "") {
         // Lets find the the current event
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
         // If we already have an event id we can just find that one
         return VotingEvent.findById(eventID);
      }
   }

   // Now we have the event
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
      // Load all the options
      event.options.forEach((optionID) => {
         promises.push(
            new Promise(function(resolve, reject) {
               VotingEventOption.findById(optionID).then((option) => {
                  if (option == null) {
                     // We found a broken link!
                     errors.push(optionID);
                     return;
                  }

                  // Forget about score
                  option.score = undefined;
                  if (option.awards != null && option.awards.length != 0) {
                     options.push(option);
                  }
                  resolve();
               }); // End VotingEventOption.findById
            }) // End Promise
         ); // End promises.push
      }); // End forEach

      // Do them all
      Promise.all(promises).then(() => {
         // Check for errors
         if (errors.length > 0) {
            // If there were errors
            errors.forEach((errorID) => {
               var i = event.options.indexOf(errorID);
               if (i >= 0) {
                  // Got rid of the broken links
                  event.options.splice(i, 1);
               }
            });

            // And finish by saving
            event.save().then(() => {
               console.log("Cleaned up " + errors.length + " broken links", errors);
            });
         }

         // Return the options that have awards
         res.json(options);
      });
   });
});

module.exports = router;
