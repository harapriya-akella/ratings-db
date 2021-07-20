var mongoose = require("mongoose");

var language = new mongoose.Schema({
    code: String,
    name: String
});

var Language = mongoose.model("Language", language);
module.exports = Language;