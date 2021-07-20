var mongoose = require("mongoose");

var underproduction = new mongoose.Schema({
    startYear: Number,
    tconst: String,
    titleType: String,
    genres: Array,
    region: String,
    primaryTitle: String,
    originalTitle: String,
    originalTitle: String,
    language: String
});

var UnderProduction = mongoose.model("UnderProduction", underproduction);
module.exports = UnderProduction;