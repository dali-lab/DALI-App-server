var express = require('express');
var router = express.Router();

// Getting configurations for these data models
var {VotingEvent, VotingEventOption} = require('./DBRecords/VotingEvent');

/**
* Creates a event

{
   name: "The Pitch",
   description: "You have now seen many pitches, so now please choose the three that you think showed the most merit in your opinion.",
   options: [
      {name: "Pitch 1", id: 1},
      {name: "Pitch 2", id: 2},
      {name: "Pitch 3", id: 3},
      {name: "Pitch 4", id: 4},
      {name: "Pitch 5", id: 5},
      {name: "Pitch 6", id: 6},
      {name: "Pitch 7", id: 7},
   ],
   startTime: Date,
   endTime: Date
}
*/
router.post('/create', function (req, res) {
   if (req.body.name == undefined || req.body.name == "" || req.body.description == undefined || req.body.description == "" || req.body.options == undefined || !Array.isArray(req.body.options)) {
      res.status(500).send("Failed. Invalid data! " + JSON.stringify(req.body));
      return;
   }

   var event = new VotingEvent();
});

router.get('/current', function(req, res) {

});

router.post('/submit', function(req, res) {

});

router.get('/results/current', function(req, res) {

});

router.get('/results/final', function(req, res) {

});
