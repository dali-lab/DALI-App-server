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
*     image: "https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F30750478%2F73808776949%2F1%2Foriginal.jpg?w=1000&rect=38%2C0%2C1824%2C912&s=068ff06280148aa18a9075a68ad6e060" (allow this one to not be here, defaulting to this value),
*     options: [
*        {name: "Pitch 1", id: 1},
*     ],
*     startTime: Date (allow this one to not be here, defaulting to now),
*     endTime: Date (allow this one to not be here, defaulting to midnight)
* }

* Should also add the following values:
* resultsReleased: true
*/
router.post('/create', function (req, res) {
   if (req.body.name == undefined || req.body.name == "" || req.body.description == undefined || req.body.description == "" || req.body.options == undefined || !Array.isArray(req.body.options)) {
      res.status(500).send("Failed. Invalid data! " + JSON.stringify(req.body));
      return;
   }

   // This should be in all of them
   if (req.body.API_KEY != process.env.API_KEY) {
      res.status(403).status("Unauthorized request. This method can only be called from the DALI Lab iOS or Android app");
      return;
   }

   var event = new VotingEvent();

});

/**
* Returns the event object whos start time is before now and end time is after now.
*/
router.get('/current', function(req, res) {

});

/**
* Makes note of a user's votes, adding the appropriate score to each VotingEventOption object
*
* Parameters:
* {
*     event: 1, (id)
*     first: 32, (option id)
*     second: 21, (option id)
*     third: 3, (option id)
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

})

/**
* Get
*/
router.get('/results/current', function(req, res) {

});

/**
*
*/
router.get('/results/final', function(req, res) {

});