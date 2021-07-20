var express = require("express");
var app = express();
const bodyParser = require('body-parser');
var mongoose = require("mongoose");
var config = require('config');
var cors = require('cors')
var port = config.app.port;

mongoose.connect("mongodb://localhost:27017/imdb_3", { useNewUrlParser: true }, (err, data) => {
});
mongoose.Promise = global.Promise;
app.use(bodyParser.json());

app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));

app.use(cors({
    origin: ['http://localhost:3000'],
    credentials: true
}));

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use(express.static(__dirname));

//routes
const user = require("./routes/user")
const analysis = require("./routes/analysis")
const country = require("./routes/country")
const language = require("./routes/language")
const unzip = require("./routes/unzip")
const setting = require("./routes/setting")
const activity = require("./routes/activity")

// const static_path = express.static(__dirname+"/")
app.use("/user", user)
app.use("/unzip", unzip)
app.use("/analysis", analysis)
app.use("/country", country)
app.use("/language", language)
app.use("/setting", setting)
app.use("/activity", activity)

app.listen(port, () => {
    console.log("Server listening on Port- " + port);
});

config = config.get('app')