
var mongoose = require("mongoose");

var country = new mongoose.Schema({
    code: String,
    name: String
});

var Country = mongoose.model("Country", country);
module.exports = Country;