var mongoose = require('mongoose');

var TimLocationSchema = new mongoose.Schema({
  inDALI: Boolean,
  inOffice: Boolean
});

TimLocationSchema.set('toJSON', {
  virtuals: true,
  versionKey:false,
  transform: function (doc, ret) {   delete ret._id; delete ret.id }
});
var TimLocation = mongoose.model('TimLocation', TimLocationSchema);

module.exports = TimLocation
