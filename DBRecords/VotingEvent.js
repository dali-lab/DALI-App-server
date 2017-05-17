/**
VotingEvent.js

Creates and exports a VotingEvent mongoose model
*/

var mongoose = require('mongoose');
var exports = module.exports = {};

// An option for voting
var VotingEventOptionSchema = new mongoose.Schema({
   _id : Number,
   name: String,
   description: String,
   score: Number
});
// The actual event data object
var VotingEventSchema = new mongoose.Schema({
   _id: Number,
   name: String,
   image: String,
   description: String,
   startTime: Date,
   endTime: Date,
   resultsReleased: Boolean,
   options: [{ type: Number, ref: 'VotingEventOption' }],
   results: String, // This is a JSON string with the winners = [ {name: "Pitch 1", award: "Popular choice"} ]
});

// Strips the data I don't want to send, like ids and likewise
VotingEventSchema.set('toJSON', {
   virtuals: true,
   versionKey: false,
   transform: function (doc, ret) { delete ret._id; delete ret.id }
});
// Strips data we don't need
VotingEventOptionSchema.set('toJSON', {
   virtuals: true,
   versionKey: false,
});

// Export
exports.VotingEvent = mongoose.model('VotingEvent', VotingEventSchema);
exports.VotingEventOption = mongoose.model('VotingEventOption', VotingEventOptionSchema);

module.exports = exports;
