var mongoose = require("mongoose");
require('mongoose-type-email')
var user = new mongoose.Schema({
    id: Number,
    first_name: String,
    last_name: String,
    email: mongoose.SchemaTypes.Email,
    phone_number: {
        type: String,
        validate: {
            validator: function (v) {
                return /^[0-9]{10}$/.test(v);
            },
            message: '{VALUE} is not a valid phone number!'
        },
    },
    profile_pic: String,
    password: String
});

var User = mongoose.model("User", user);
module.exports = User;


