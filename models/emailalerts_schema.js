var mongoose = require("mongoose");
var emailalerts = new mongoose.Schema({
    query: { type: [Object], blackbox: true },
    name: String,
    frequency: Number,
    next_date_of_fire: Date,
    created_on: Date,
    sent_to: String
});

var EmailAlerts = mongoose.model("EmailAlerts", emailalerts);
module.exports = EmailAlerts;