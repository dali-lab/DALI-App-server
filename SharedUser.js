var mongoose = require('mongoose');

var SharedUserSchema = new mongoose.Schema({
  email: String,
  name: String,
  identifier: Number,
  inDALI: Boolean,
  shared: Boolean
});

SharedUserSchema.set('toJSON', {
  virtuals: true,
  versionKey:false,
  transform: function (doc, ret) {   delete ret._id; delete ret.id }
});
var SharedUser = mongoose.model('SharedUser', SharedUserSchema);

module.exports = SharedUser
