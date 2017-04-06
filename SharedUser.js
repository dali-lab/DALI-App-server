/**
 SharedUser.js

 Creates and exports a SharedUser mongoose model
 */

var mongoose = require('mongoose');

var SharedUserSchema = new mongoose.Schema({
  email: String,
  name: String,
  identifier: Number,
  inDALI: Boolean,
  shared: Boolean
});

// Strips the data I don't want to send, like ids and likewise
SharedUserSchema.set('toJSON', {
  virtuals: true,
  versionKey:false,
  transform: function (doc, ret) {   delete ret._id; delete ret.id }
});
var SharedUser = mongoose.model('SharedUser', SharedUserSchema);

module.exports = SharedUser
