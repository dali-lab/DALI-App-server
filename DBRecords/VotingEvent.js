/**
VotingEvent.js

Creates and exports a VotingEvent mongoose model
*/

var mongoose = require('mongoose');
var exports = module.exports = {};

// An option for voting
var VoteLogSchema = new mongoose.Schema({
   event: { type: mongoose.Schema.Types.ObjectId, ref: 'VotingEvent', required: true },
   first: { type: mongoose.Schema.Types.ObjectId, ref: 'VotingEventOption', required: true },
   second: { type: mongoose.Schema.Types.ObjectId, ref: 'VotingEventOption', required: true },
   third: { type: mongoose.Schema.Types.ObjectId, ref: 'VotingEventOption', required: true },
   user: String,
   ip: { type: String, required: true }
});

// An option for voting
var VotingEventOptionSchema = new mongoose.Schema({
   name: String,
   score: Number,
   award: String
});

// The actual event data object
var VotingEventSchema = new mongoose.Schema({
   name: { type: String, required: true },
   image: String,
   description: { type: String, required: true},
   startTime: { type: Date, required: true},
   endTime: { type: Date, required: true},
   resultsReleased: { type: Boolean, required: true},
   options: [{ type: mongoose.Schema.Types.ObjectId, ref: 'VotingEventOption' }],
});

// Strips the data I don't want to send, like ids and likewise
VotingEventSchema.set('toJSON', {
   virtuals: true,
   versionKey: false,
   transform: function (doc, ret) { delete ret._id; }
});
// Strips data we don't need
VotingEventOptionSchema.set('toJSON', {
   virtuals: true,
   versionKey: false,
   transform: function (doc, ret) { delete ret._id; }
});

VoteLogSchema.set('toJSON', {
   virtuals: true,
   versionKey: false,
   transform: function(doc, ret) { delete ret._id; }
});

// Export
exports.VoteLog = mongoose.model('VoteLog', VoteLogSchema);
exports.VotingEvent = mongoose.model('VotingEvent', VotingEventSchema);
exports.VotingEventOption = mongoose.model('VotingEventOption', VotingEventOptionSchema);

module.exports = exports;
