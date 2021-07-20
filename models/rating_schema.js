var mongoose = require("mongoose");

var rating = new mongoose.Schema({
    tconst: String,
    averageRating: Number,
    numVotes: Number,
});

var Rating = mongoose.model("Rating", rating);
module.exports = Rating;