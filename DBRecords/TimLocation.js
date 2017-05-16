/**
TimLocation.js

Creates and exports a TimLocation mongoose model
*/

var mongoose = require('mongoose');

var TimLocationSchema = new mongoose.Schema({
   inDALI: Boolean,
   inOffice: Boolean
});

// Strips the data I don't want to send, like ids and likewise
TimLocationSchema.set('toJSON', {
   virtuals: true,
   versionKey:false,
   transform: function (doc, ret) {   delete ret._id; delete ret.id }
});
var TimLocation = mongoose.model('TimLocation', TimLocationSchema);

module.exports = TimLocation
