/**
VotingEvent.js

Creates and exports a VotingEvent mongoose model
*/

var mongoose = require('mongoose');
var exports = module.exports = {};

var VotingEventOptionSchema = new mongoose.Schema({
   _id : Number,
   name: String,
   description: String,
   score: Number
});

VotingEventOptionSchema.set('toJSON', {
   virtuals: true,
   versionKey: false,
});

var VotingEventSchema = new mongoose.Schema({
   _id: Number,
   name: String,
   image: String,
   options: [{ type: Number, ref: 'VotingEventOption' }],
});

// Strips the data I don't want to send, like ids and likewise
VotingEventSchema.set('toJSON', {
   virtuals: true,
   versionKey: false,
   transform: function (doc, ret) { delete ret._id; delete ret.id }
});


exports.VotingEvent = mongoose.model('VotingEvent', VotingEventSchema);
exports.VotingEventOption = mongoose.model('VotingEventOption', VotingEventOptionSchema);

module.exports = exports;
