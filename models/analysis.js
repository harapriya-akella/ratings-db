

var mongoose = require("mongoose");

var analysis = new mongoose.Schema({
    rating : String,
    votes : String,
    titleID : String,
    year : String,
    titleType: String,
    name : String,
    region: String
});

var Analysis = mongoose.model("Analysis", analysis);
module.exports = Analysis;
